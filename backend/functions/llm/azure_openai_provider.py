"""
Azure OpenAI provider implementation.
"""
import requests
from typing import Any, Dict, List, Optional, Union

from utils.logger import configure_logger

logger = configure_logger(__name__)


class AzureOpenAIProvider:
    """
    Provider implementation for Azure OpenAI API.
    """
    
    def __init__(self, api_key, endpoint, api_version="2023-05-15", deployment_name="gpt-4"):
        """
        Initialize the Azure OpenAI provider.
        
        Args:
            api_key: Azure OpenAI API key
            endpoint: Azure OpenAI API endpoint URL
            api_version: API version string
            deployment_name: Model deployment name
        """
        self.api_key = api_key
        self.endpoint = endpoint
        self.api_version = api_version
        self.deployment_name = deployment_name
        self.api_url = f"{endpoint}/openai/deployments/{deployment_name}/chat/completions?api-version={api_version}"
        
    def generate_completion(
        self, 
        messages: List[Dict[str, str]], 
        model=None, 
        max_tokens=None, 
        temperature=0.7,
        functions=None,
        use_semantic_cache=True
    ) -> Dict[str, Any]:
        """
        Generate a completion from the model.
        
        Args:
            messages: List of message dictionaries (role and content)
            model: Model identifier (ignored in Azure, deployment name is used)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            functions: Optional function definitions for function calling
            use_semantic_cache: Whether to use semantic caching
            
        Returns:
            The API response
        """
        # Try to get from cache if enabled
        if use_semantic_cache:
            from functions.llm.provider_factory import provider_factory
            cached_result = provider_factory.get_cached_completion(messages)
            
            if cached_result:
                logger.info("Using cached completion result")
                return cached_result
        
        # Optimize messages for token efficiency
        if len(messages) > 3:  # Only optimize if conversation is substantial
            from functions.llm.provider_factory import provider_factory
            messages = provider_factory.optimize_prompt(messages)
            logger.info(f"Optimized prompt from {len(messages)} messages")
            
        # Optimize function definitions if provided
        if functions:
            from functions.llm.provider_factory import provider_factory
            functions = provider_factory.optimize_functions(functions)
            logger.info(f"Optimized {len(functions)} function definitions")
            
        # Build request payload
        payload = {
            "messages": messages,
            "temperature": temperature
        }
        
        # Add max_tokens if specified
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
            
        # Add functions if specified
        if functions:
            payload["functions"] = functions
        
        # Make API request
        response = requests.post(
            self.api_url,
            headers={
                "api-key": self.api_key,
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        # Check response
        response.raise_for_status()
        
        # Get JSON response
        result = response.json()
        
        # Cache the result if caching is enabled
        if use_semantic_cache:
            from functions.llm.provider_factory import provider_factory
            provider_factory.cache_completion(messages, result)
            
        # Return JSON response
        return result

    def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for the provided text.
        
        Args:
            text: The text to generate embeddings for.
            
        Returns:
            A list of floating point numbers representing the embedding vector.
            
        Raises:
            ValueError: If the API request fails.
        """
        # Use the optimized embedding service
        from functions.embedding.embedding_service import EmbeddingService
        embedding_service = EmbeddingService()
        return embedding_service.generate_embedding(text)
    
    def complete_text(
        self, 
        prompt: str, 
        max_tokens: int = 1000,
        temperature: float = 0.7,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate text completion for the provided prompt.
        
        Args:
            prompt: The text prompt to complete.
            max_tokens: Maximum number of tokens to generate.
            temperature: Temperature parameter for controlling randomness.
            options: Additional options for the completion API.
            
        Returns:
            The generated text completion.
            
        Raises:
            ValueError: If the API request fails.
        """
        # Convert text prompt to chat format
        messages = [{"role": "user", "content": prompt}]
        
        # Generate completion
        response = self.generate_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        # Extract completion text
        try:
            completion = response["choices"][0]["message"]["content"]
            return completion
        except (KeyError, IndexError) as e:
            logger.error(f"Error extracting completion: {str(e)}")
            return f"Error: Could not generate completion for: {prompt}" 