"""
LLM provider factory module.
"""

import os
from typing import Dict, List, Optional, Union

from functions.llm.azure_openai_provider import AzureOpenAIProvider
from functions.llm.together_provider import TogetherProvider
from functions.llm.prompt_optimizer import PromptOptimizer, TokenizationMethod
from shared.cache import SemanticCache, RedisCache
from utils.logger import configure_logger

logger = configure_logger(__name__)


class ProviderFactory:
    """
    Factory class for creating LLM provider instances.
    """
    
    def __init__(self):
        """
        Initialize the provider factory.
        """
        self.providers = {}
        self.optimizer = PromptOptimizer()
        
        # Initialize semantic cache
        redis_cache = RedisCache()
        self.semantic_cache = SemanticCache(redis_cache)
        
    def get_provider(self, provider_type: str):
        """
        Get or create a provider of the specified type.
        
        Args:
            provider_type: Provider type identifier
            
        Returns:
            Provider instance
        """
        # Check if we already have this provider
        if provider_type in self.providers:
            return self.providers[provider_type]
            
        # Create a new provider
        if provider_type == "azure_openai":
            api_key = os.environ.get("AZURE_OPENAI_API_KEY")
            endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
            api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2023-05-15")
            deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            
            provider = AzureOpenAIProvider(
                api_key=api_key, 
                endpoint=endpoint,
                api_version=api_version,
                deployment_name=deployment_name
            )
        elif provider_type == "together":
            api_key = os.environ.get("TOGETHER_API_KEY")
            model = os.environ.get("TOGETHER_MODEL", "mistralai/Mixtral-8x7B-Instruct-v0.1")
            
            provider = TogetherProvider(
                api_key=api_key,
                model=model
            )
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
            
        # Store and return the provider
        self.providers[provider_type] = provider
        return provider
    
    def optimize_prompt(self, messages: List[Dict[str, str]], max_tokens: Optional[int] = None) -> List[Dict[str, str]]:
        """
        Optimize a prompt to reduce token usage.
        
        Args:
            messages: List of message dictionaries
            max_tokens: Maximum tokens to target
            
        Returns:
            Optimized message list
        """
        return self.optimizer.optimize_chat_messages(messages, max_tokens)
    
    def optimize_functions(self, functions: List[Dict]) -> List[Dict]:
        """
        Optimize function definitions to reduce token usage.
        
        Args:
            functions: List of function definitions
            
        Returns:
            Optimized function definitions
        """
        return self.optimizer.optimize_function_definitions(functions)
    
    def get_cached_completion(self, messages: List[Dict[str, str]]) -> Optional[Dict]:
        """
        Get cached completion result for messages.
        
        Args:
            messages: List of message dictionaries
            
        Returns:
            Cached result if found, None otherwise
        """
        return self.semantic_cache.get(messages)
    
    def cache_completion(self, messages: List[Dict[str, str]], result: Dict) -> None:
        """
        Cache completion result for future similar queries.
        
        Args:
            messages: List of message dictionaries
            result: Query result to cache
        """
        self.semantic_cache.set(messages, result)


# Singleton provider factory instance
provider_factory = ProviderFactory() 