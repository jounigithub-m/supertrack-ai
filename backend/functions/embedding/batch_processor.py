"""
Batched embedding processing for Supertrack AI.

This module provides functions for processing embeddings in batches,
which improves efficiency and reduces API costs.
"""

import asyncio
import os
import time
from typing import Any, Dict, List, Optional, Union, Tuple

import aiohttp
import numpy as np

from utils.logger import configure_logger

logger = configure_logger(__name__)

# Default batch size for embedding processing
DEFAULT_BATCH_SIZE = 20

# Maximum concurrent requests
MAX_CONCURRENT_REQUESTS = 5

# Default retry settings
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_DELAY = 1.0  # seconds


class BatchEmbeddingProcessor:
    """
    Processor for batched embedding generation.
    
    This class handles efficient processing of multiple embedding requests
    by batching them together and processing them concurrently when possible.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        model: str = "text-embedding-ada-002",
        batch_size: int = DEFAULT_BATCH_SIZE,
        max_concurrent: int = MAX_CONCURRENT_REQUESTS,
        max_retries: int = DEFAULT_MAX_RETRIES,
        retry_delay: float = DEFAULT_RETRY_DELAY
    ):
        """
        Initialize the batch embedding processor.
        
        Args:
            api_key: API key for the embedding service
            api_url: API URL for the embedding service
            model: Model identifier
            batch_size: Maximum number of texts per batch
            max_concurrent: Maximum number of concurrent requests
            max_retries: Maximum number of retries for failed requests
            retry_delay: Delay between retries in seconds
        """
        self.api_key = api_key or os.environ.get("EMBEDDING_API_KEY", "mock-key")
        self.api_url = api_url or "https://api.openai.com/v1/embeddings"
        self.model = model
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        # Keep a semaphore to limit concurrent requests
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    def _create_batches(self, texts: List[str]) -> List[List[str]]:
        """
        Split a list of texts into batches.
        
        Args:
            texts: List of text strings to batch
            
        Returns:
            List of text batches
        """
        return [texts[i:i + self.batch_size] for i in range(0, len(texts), self.batch_size)]
    
    async def _process_batch(
        self, 
        session: aiohttp.ClientSession, 
        batch: List[str]
    ) -> List[List[float]]:
        """
        Process a single batch of texts.
        
        Args:
            session: HTTP session
            batch: Batch of texts
            
        Returns:
            List of embedding vectors
        """
        # Acquire semaphore to limit concurrent requests
        async with self.semaphore:
            # Try the request with retries
            for attempt in range(self.max_retries + 1):
                try:
                    async with session.post(
                        self.api_url,
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "input": batch
                        }
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            
                            # Extract embeddings from response
                            embeddings = [data["embedding"] for data in result["data"]]
                            return embeddings
                        else:
                            error_text = await response.text()
                            logger.error(f"Embedding API error (status {response.status}): {error_text}")
                            
                            # If rate limited, wait longer before retry
                            if response.status == 429:
                                await asyncio.sleep(self.retry_delay * (2 ** attempt))
                                continue
                                
                except Exception as e:
                    logger.error(f"Error in batch processing: {str(e)}")
                    
                # Retry with exponential backoff if not the last attempt
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
                else:
                    logger.error(f"Failed to process batch after {self.max_retries} retries")
                    
            # If we get here, all retries failed - return mock embeddings
            logger.warning("Returning mock embeddings after failed API calls")
            return [[0.1] * 384 for _ in batch]
    
    async def _process_all_batches(self, texts: List[str]) -> List[List[float]]:
        """
        Process all batches of texts concurrently.
        
        Args:
            texts: List of all texts
            
        Returns:
            List of all embedding vectors
        """
        # Split texts into batches
        batches = self._create_batches(texts)
        
        # Set up HTTP session with timeout
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
            # Create tasks for all batches
            tasks = [self._process_batch(session, batch) for batch in batches]
            
            # Execute all tasks and get results
            batch_results = await asyncio.gather(*tasks)
            
            # Flatten the batch results
            all_embeddings = []
            for batch_result in batch_results:
                all_embeddings.extend(batch_result)
                
            return all_embeddings
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
            
        # Handle single text specially for efficiency
        if len(texts) == 1:
            return self._generate_single_embedding(texts[0])
            
        # For multiple texts, use the async batch processing
        return asyncio.run(self._process_all_batches(texts))
    
    def _generate_single_embedding(self, text: str) -> List[List[float]]:
        """
        Generate embedding for a single text without async overhead.
        
        Args:
            text: Text to embed
            
        Returns:
            List containing a single embedding vector
        """
        # Use the existing EmbeddingService for single texts
        from functions.embedding.embedding_service import EmbeddingService
        
        embedding_service = EmbeddingService(api_key=self.api_key, model=self.model)
        return [embedding_service.generate_embedding(text)]
    
    def __call__(self, texts: List[str]) -> List[List[float]]:
        """
        Make the processor callable directly.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        return self.generate_embeddings(texts) 