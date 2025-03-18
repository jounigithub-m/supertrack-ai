"""LLM client for agent-LLM interactions."""

import json
import logging
from typing import Any, Dict, List, Optional, Union

import aiohttp


class LLMClient:
    """Client for interacting with Large Language Models through various providers.
    
    This class abstracts away the details of communicating with different LLM
    providers and provides a unified interface for agents to use.
    """
    
    def __init__(
        self,
        provider: str = "azure-openai",
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        api_version: Optional[str] = None,
        deployment_id: Optional[str] = None,
        together_ai_key: Optional[str] = None,
        model_name: str = "gpt-4",
        timeout: int = 60,
        max_tokens: int = 4000,
        temperature: float = 0.0,
        logger: Optional[logging.Logger] = None,
    ):
        """Initialize the LLM client.
        
        Args:
            provider: LLM provider to use (azure-openai, openai, together)
            api_key: API key for the provider
            api_base: Base URL for API calls
            api_version: API version to use for Azure OpenAI
            deployment_id: Deployment ID for Azure OpenAI
            together_ai_key: API key for Together.ai
            model_name: Name of the model to use
            timeout: Timeout in seconds for API calls
            max_tokens: Maximum tokens to generate in responses
            temperature: Temperature for generation (0-1)
            logger: Optional logger to use for logging
        """
        self.provider = provider
        self.api_key = api_key
        self.api_base = api_base
        self.api_version = api_version
        self.deployment_id = deployment_id
        self.together_ai_key = together_ai_key
        self.model_name = model_name
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.logger = logger or logging.getLogger("llm_client")
    
    async def generate_text(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stop_sequences: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate text from the LLM.
        
        Args:
            prompt: The prompt to send to the LLM
            system_message: Optional system message to set context
            messages: Optional list of previous messages for chat models
            max_tokens: Maximum tokens to generate (overrides instance setting)
            temperature: Temperature for generation (overrides instance setting)
            stop_sequences: List of sequences that will stop generation
            
        Returns:
            Dictionary with generated text and metadata
        """
        if self.provider == "azure-openai":
            return await self._azure_openai_generate(
                prompt, system_message, messages, max_tokens, temperature, stop_sequences
            )
        elif self.provider == "openai":
            return await self._openai_generate(
                prompt, system_message, messages, max_tokens, temperature, stop_sequences
            )
        elif self.provider == "together":
            return await self._together_generate(
                prompt, system_message, messages, max_tokens, temperature, stop_sequences
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def _azure_openai_generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stop_sequences: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate text using Azure OpenAI.
        
        Args:
            prompt: The prompt to send to the LLM
            system_message: Optional system message to set context
            messages: Optional list of previous messages for chat models
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            stop_sequences: List of sequences that will stop generation
            
        Returns:
            Dictionary with generated text and metadata
        """
        if not self.api_key or not self.api_base or not self.deployment_id:
            raise ValueError("Azure OpenAI requires api_key, api_base, and deployment_id")
        
        # Prepare the messages
        if messages is None:
            messages = []
        
        # Add system message if provided
        if system_message:
            messages.insert(0, {"role": "system", "content": system_message})
        
        # Add user prompt if not in messages
        if not messages or messages[-1]["role"] != "user":
            messages.append({"role": "user", "content": prompt})
        
        # Prepare request payload
        payload = {
            "messages": messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature if temperature is not None else self.temperature,
        }
        
        if stop_sequences:
            payload["stop"] = stop_sequences
        
        # Prepare request headers
        headers = {
            "Content-Type": "application/json",
            "api-key": self.api_key,
        }
        
        # Build the request URL
        url = f"{self.api_base}/openai/deployments/{self.deployment_id}/chat/completions?api-version={self.api_version}"
        
        # Make the API call
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                ) as response:
                    result = await response.json()
                    
                    if response.status != 200:
                        self.logger.error(f"Azure OpenAI API error: {result}")
                        raise Exception(f"Azure OpenAI API error: {result.get('error', {}).get('message', 'Unknown error')}")
                    
                    # Extract and format the response
                    response_text = result["choices"][0]["message"]["content"]
                    usage = result.get("usage", {})
                    
                    return {
                        "text": response_text,
                        "usage": {
                            "prompt_tokens": usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                            "total_tokens": usage.get("total_tokens", 0),
                        },
                        "provider": "azure-openai",
                        "model": self.model_name,
                    }
        
        except Exception as e:
            self.logger.error(f"Error calling Azure OpenAI: {str(e)}")
            raise
    
    async def _openai_generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stop_sequences: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate text using OpenAI API.
        
        Args:
            prompt: The prompt to send to the LLM
            system_message: Optional system message to set context
            messages: Optional list of previous messages for chat models
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            stop_sequences: List of sequences that will stop generation
            
        Returns:
            Dictionary with generated text and metadata
        """
        if not self.api_key:
            raise ValueError("OpenAI requires api_key")
        
        # Prepare the messages
        if messages is None:
            messages = []
        
        # Add system message if provided
        if system_message:
            messages.insert(0, {"role": "system", "content": system_message})
        
        # Add user prompt if not in messages
        if not messages or messages[-1]["role"] != "user":
            messages.append({"role": "user", "content": prompt})
        
        # Prepare request payload
        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature if temperature is not None else self.temperature,
        }
        
        if stop_sequences:
            payload["stop"] = stop_sequences
        
        # Prepare request headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        
        # Build the request URL
        url = "https://api.openai.com/v1/chat/completions"
        
        # Make the API call
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                ) as response:
                    result = await response.json()
                    
                    if response.status != 200:
                        self.logger.error(f"OpenAI API error: {result}")
                        raise Exception(f"OpenAI API error: {result.get('error', {}).get('message', 'Unknown error')}")
                    
                    # Extract and format the response
                    response_text = result["choices"][0]["message"]["content"]
                    usage = result.get("usage", {})
                    
                    return {
                        "text": response_text,
                        "usage": {
                            "prompt_tokens": usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                            "total_tokens": usage.get("total_tokens", 0),
                        },
                        "provider": "openai",
                        "model": self.model_name,
                    }
        
        except Exception as e:
            self.logger.error(f"Error calling OpenAI: {str(e)}")
            raise
    
    async def _together_generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stop_sequences: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generate text using Together.ai API.
        
        Args:
            prompt: The prompt to send to the LLM
            system_message: Optional system message to set context
            messages: Optional list of previous messages for chat models
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            stop_sequences: List of sequences that will stop generation
            
        Returns:
            Dictionary with generated text and metadata
        """
        if not self.together_ai_key:
            raise ValueError("Together.ai requires together_ai_key")
        
        # Format prompt for Together.ai based on whether messages are provided
        if messages:
            # Handle chat format for Together.ai
            formatted_messages = []
            
            # Add system message if provided
            if system_message:
                formatted_messages.append({"role": "system", "content": system_message})
            
            # Add existing messages
            formatted_messages.extend(messages)
            
            # Add user prompt if not in messages
            if not messages or messages[-1]["role"] != "user":
                formatted_messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": self.model_name,
                "messages": formatted_messages,
                "max_tokens": max_tokens or self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
            }
        else:
            # Handle completion format
            full_prompt = ""
            if system_message:
                full_prompt = f"{system_message}\n\n"
            full_prompt += prompt
            
            payload = {
                "model": self.model_name,
                "prompt": full_prompt,
                "max_tokens": max_tokens or self.max_tokens,
                "temperature": temperature if temperature is not None else self.temperature,
            }
        
        if stop_sequences:
            payload["stop"] = stop_sequences
        
        # Prepare request headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.together_ai_key}",
        }
        
        # Build the request URL - choose between chat and completion endpoints
        if messages:
            url = "https://api.together.xyz/v1/chat/completions"
        else:
            url = "https://api.together.xyz/v1/completions"
        
        # Make the API call
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                ) as response:
                    result = await response.json()
                    
                    if response.status != 200:
                        self.logger.error(f"Together.ai API error: {result}")
                        raise Exception(f"Together.ai API error: {result.get('error', {}).get('message', 'Unknown error')}")
                    
                    # Extract and format the response based on endpoint
                    if messages:
                        response_text = result["choices"][0]["message"]["content"]
                    else:
                        response_text = result["choices"][0]["text"]
                    
                    usage = result.get("usage", {})
                    
                    return {
                        "text": response_text,
                        "usage": {
                            "prompt_tokens": usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                            "total_tokens": usage.get("total_tokens", 0),
                        },
                        "provider": "together",
                        "model": self.model_name,
                    }
        
        except Exception as e:
            self.logger.error(f"Error calling Together.ai: {str(e)}")
            raise
    
    async def extract_json_from_text(
        self,
        text: str,
        default_value: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Extract a JSON object from text response.
        
        Args:
            text: Text containing JSON (possibly with surrounding text)
            default_value: Default value to return if JSON cannot be parsed
            
        Returns:
            Parsed JSON object or default value
        """
        # Try to find JSON object in text
        try:
            # First, look for JSON objects enclosed in triple backticks
            import re
            json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
            
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            
            # Next, try to find JSON objects with curly braces
            json_match = re.search(r"\{[\s\S]*\}", text)
            
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            
            # If we can't find JSON objects, try parsing the entire response
            return json.loads(text)
        
        except Exception as e:
            self.logger.warning(f"Failed to extract JSON from response: {str(e)}")
            return default_value or {} 