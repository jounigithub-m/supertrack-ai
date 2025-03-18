"""
Semantic caching system for LLM queries.

This module implements semantic caching for LLM operations, allowing for reuse of results
for semantically similar queries, saving time and reducing costs.
"""

import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from scipy.spatial.distance import cosine

from shared.cache.redis_cache import CacheLevel, CacheTTL, RedisCache
from shared.config import settings
from utils.logger import configure_logger

logger = configure_logger(__name__)

class SemanticCache:
    """
    Cache for semantically similar queries.
    
    This cache stores embeddings of queries along with their results and can
    retrieve results for semantically similar queries based on cosine similarity.
    """
    
    def __init__(
        self,
        redis_cache: RedisCache,
        similarity_threshold: float = 0.92,
        ttl: int = CacheTTL.MEDIUM,
        namespace: str = "semantic_cache",
    ):
        """
        Initialize the semantic cache.
        
        Args:
            redis_cache: Redis cache instance
            similarity_threshold: Threshold for considering queries similar (0.0-1.0)
            ttl: Default TTL for cache entries
            namespace: Namespace for cache keys
        """
        self.redis_cache = redis_cache
        self.similarity_threshold = similarity_threshold
        self.ttl = ttl
        self.namespace = namespace
        self.index_key = f"{namespace}:index"
    
    def _get_embedding_service(self):
        """
        Get an embedding service instance lazily.
        
        Returns:
            EmbeddingService instance
        """
        # Import here to avoid circular imports
        from functions.embedding.embedding_service import EmbeddingService
        
        # Create an embedding service for query embedding
        return EmbeddingService()
    
    def _hash_query(self, query: Union[str, Dict[str, Any], List[Dict[str, Any]]]) -> str:
        """
        Create a deterministic hash for a query.
        
        Args:
            query: Query string or message list
            
        Returns:
            Hash string
        """
        if isinstance(query, str):
            query_str = query
        else:
            query_str = json.dumps(query, sort_keys=True)
            
        return hashlib.sha256(query_str.encode()).hexdigest()
    
    def _get_embedding(self, query: Union[str, Dict[str, Any], List[Dict[str, Any]]]) -> List[float]:
        """
        Get embedding for a query.
        
        Args:
            query: Query string or message list
            
        Returns:
            Embedding vector
        """
        embedding_service = self._get_embedding_service()
        
        if isinstance(query, str):
            query_text = query
        elif isinstance(query, list) and all(isinstance(m, dict) for m in query):
            # For message lists, concatenate the content
            query_text = " ".join(m.get("content", "") for m in query if "content" in m)
        else:
            # For other structured queries, convert to JSON
            query_text = json.dumps(query)
            
        return embedding_service.generate_embedding(query_text)
    
    def _get_index(self) -> Dict[str, List[float]]:
        """
        Get the current embedding index.
        
        Returns:
            Dictionary mapping query hashes to embeddings
        """
        index = self.redis_cache.get_json(self.index_key)
        return index or {}
    
    def _update_index(self, query_hash: str, embedding: List[float]) -> None:
        """
        Add a query embedding to the index.
        
        Args:
            query_hash: Hash of the query
            embedding: Query embedding vector
        """
        # Get current index
        index = self._get_index()
        
        # Add new embedding
        index[query_hash] = embedding
        
        # Update index in cache
        self.redis_cache.set_json(self.index_key, index, ttl=self.ttl)
    
    def _find_similar_query(
        self, 
        query_embedding: List[float]
    ) -> Optional[Tuple[str, float]]:
        """
        Find a similar query in the index.
        
        Args:
            query_embedding: Embedding of the current query
            
        Returns:
            Tuple of (query_hash, similarity) if found, None otherwise
        """
        index = self._get_index()
        
        if not index:
            return None
        
        # Convert to numpy for vector operations
        query_vec = np.array(query_embedding)
        
        # Find the most similar query
        best_match = None
        highest_similarity = 0.0
        
        for query_hash, embedding in index.items():
            # Calculate cosine similarity (1.0 means identical)
            similarity = 1.0 - cosine(query_vec, np.array(embedding))
            
            if similarity > self.similarity_threshold and similarity > highest_similarity:
                highest_similarity = similarity
                best_match = query_hash
        
        return (best_match, highest_similarity) if best_match else None
    
    def get(self, query: Union[str, Dict[str, Any], List[Dict[str, Any]]]) -> Optional[Dict[str, Any]]:
        """
        Get cached result for a query.
        
        Args:
            query: Query string or message list
            
        Returns:
            Cached result if found, None otherwise
        """
        # First try exact match using hash
        query_hash = self._hash_query(query)
        exact_key = f"{self.namespace}:{query_hash}"
        
        # Try to get exact match
        exact_match = self.redis_cache.get_json(exact_key)
        if exact_match:
            logger.info(f"Exact cache hit for query: {query_hash}")
            return exact_match
        
        # No exact match, try semantic matching
        query_embedding = self._get_embedding(query)
        similar = self._find_similar_query(query_embedding)
        
        if similar:
            similar_hash, similarity = similar
            similar_key = f"{self.namespace}:{similar_hash}"
            
            # Get the cached result for the similar query
            similar_result = self.redis_cache.get_json(similar_key)
            
            if similar_result:
                logger.info(f"Semantic cache hit for query: {query_hash} -> {similar_hash} (similarity: {similarity:.4f})")
                
                # Add semantic match metadata
                if isinstance(similar_result, dict):
                    similar_result["_cache_metadata"] = {
                        "semantic_match": True,
                        "similarity": similarity,
                        "original_query_hash": similar_hash
                    }
                
                return similar_result
        
        return None
    
    def set(
        self, 
        query: Union[str, Dict[str, Any], List[Dict[str, Any]]], 
        result: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> None:
        """
        Cache result for a query.
        
        Args:
            query: Query string or message list
            result: Query result to cache
            ttl: Optional TTL override
        """
        query_hash = self._hash_query(query)
        cache_key = f"{self.namespace}:{query_hash}"
        
        # Get query embedding and update index
        query_embedding = self._get_embedding(query)
        self._update_index(query_hash, query_embedding)
        
        # Cache the result
        self.redis_cache.set_json(cache_key, result, ttl=ttl or self.ttl)
        
        logger.info(f"Cached result for query: {query_hash}") 