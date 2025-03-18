"""
Prompt optimization for token efficiency.

This module provides tools to optimize prompts to minimize token usage while
maintaining effectiveness, leading to faster responses and lower costs.
"""

import json
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

from utils.logger import configure_logger

logger = configure_logger(__name__)


class TokenizationMethod(str, Enum):
    """Different tokenization methods for estimation."""
    GPT3 = "gpt3"  # Roughly 4 chars per token for English text
    GPT4 = "gpt4"  # Similar to GPT-3 but slightly more efficient
    CLAUDE = "claude"  # Typically more efficient than GPT


class PromptOptimizer:
    """
    Optimizer for LLM prompts to improve token efficiency.
    
    This class provides methods to reduce token usage while preserving
    the semantic meaning and structure of prompts.
    """
    
    def __init__(self, tokenization_method: TokenizationMethod = TokenizationMethod.GPT4):
        """
        Initialize the prompt optimizer.
        
        Args:
            tokenization_method: Method to use for token estimation
        """
        self.tokenization_method = tokenization_method
        
    def estimate_tokens(self, text: str) -> int:
        """
        Estimate the number of tokens in a text string.
        
        Args:
            text: The text to estimate tokens for
            
        Returns:
            Estimated token count
        """
        # Simple approximation based on tokenization method
        if self.tokenization_method == TokenizationMethod.GPT3:
            return len(text) // 4
        elif self.tokenization_method == TokenizationMethod.GPT4:
            return len(text) // 4
        elif self.tokenization_method == TokenizationMethod.CLAUDE:
            return len(text) // 5
        
        # Default fallback
        return len(text) // 4
    
    def optimize_chat_messages(
        self, 
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        preserve_recent: int = 2
    ) -> List[Dict[str, str]]:
        """
        Optimize a list of chat messages for token efficiency.
        
        Args:
            messages: List of message dictionaries
            max_tokens: Maximum tokens to allow (if None, optimize without strict limit)
            preserve_recent: Number of recent messages to preserve fully
            
        Returns:
            Optimized list of messages
        """
        if not messages:
            return []
            
        # Estimate current token count
        current_tokens = sum(self.estimate_tokens(m.get("content", "")) for m in messages)
        
        # If under limit or no limit specified and not very long, return as is
        if (max_tokens is None and current_tokens < 8000) or (max_tokens and current_tokens <= max_tokens):
            return messages
            
        # Preserve system message if present
        system_message = None
        other_messages = []
        
        for msg in messages:
            if msg.get("role") == "system":
                system_message = msg
            else:
                other_messages.append(msg)
                
        # Determine messages to preserve fully
        preserved_messages = other_messages[-preserve_recent:] if preserve_recent > 0 else []
        messages_to_optimize = other_messages[:-preserve_recent] if preserve_recent > 0 else other_messages
        
        # If very few messages to optimize, don't bother
        if len(messages_to_optimize) <= 1:
            return messages
            
        # Calculate token budget for optimized messages
        preserved_tokens = sum(self.estimate_tokens(m.get("content", "")) for m in preserved_messages)
        system_tokens = self.estimate_tokens(system_message.get("content", "")) if system_message else 0
        
        token_budget = max_tokens - preserved_tokens - system_tokens if max_tokens else 6000
        
        # If budget is negative, we need to be aggressive
        if token_budget <= 0:
            token_budget = 2000  # Minimum budget
        
        # Optimize messages to fit within budget
        optimized_messages = self._optimize_messages_to_budget(messages_to_optimize, token_budget)
        
        # Reconstruct message list
        result = []
        if system_message:
            result.append(system_message)
        result.extend(optimized_messages)
        result.extend(preserved_messages)
        
        return result
    
    def _optimize_messages_to_budget(
        self, 
        messages: List[Dict[str, str]], 
        token_budget: int
    ) -> List[Dict[str, str]]:
        """
        Optimize messages to fit within a token budget.
        
        Args:
            messages: List of message dictionaries
            token_budget: Maximum tokens to use
            
        Returns:
            Optimized list of messages
        """
        # If no messages, return empty list
        if not messages:
            return []
            
        # If only one message, optimize it directly
        if len(messages) == 1:
            return [self._optimize_single_message(messages[0], token_budget)]
            
        # Estimate initial tokens per message
        tokens_per_message = [self.estimate_tokens(m.get("content", "")) for m in messages]
        total_tokens = sum(tokens_per_message)
        
        # If already within budget, no optimization needed
        if total_tokens <= token_budget:
            return messages
            
        # Sort messages by age, prioritizing newer messages
        weighted_messages = [(i / len(messages), m, t) for i, (m, t) in enumerate(zip(messages, tokens_per_message))]
        
        # Allocate token budget proportionally to message age
        allocated_tokens = []
        for weight, msg, tokens in weighted_messages:
            # Newer messages get more of their original tokens
            allocation = min(tokens, int(token_budget * weight * 2))
            allocated_tokens.append(allocation)
            
        # Adjust allocations to fit within budget
        total_allocated = sum(allocated_tokens)
        if total_allocated > token_budget:
            # Scale down proportionally
            scale_factor = token_budget / total_allocated
            allocated_tokens = [int(t * scale_factor) for t in allocated_tokens]
            
        # Optimize each message according to its allocation
        optimized_messages = []
        for (_, msg, _), allocation in zip(weighted_messages, allocated_tokens):
            if allocation <= 10:  # Too small to be useful
                # Replace with a summary placeholder
                optimized_messages.append({
                    "role": msg.get("role", "assistant"),
                    "content": f"[Earlier message omitted for brevity]"
                })
            else:
                optimized_messages.append(self._optimize_single_message(msg, allocation))
                
        return optimized_messages
    
    def _optimize_single_message(self, message: Dict[str, str], token_budget: int) -> Dict[str, str]:
        """
        Optimize a single message to fit within a token budget.
        
        Args:
            message: Message dictionary
            token_budget: Maximum tokens to use
            
        Returns:
            Optimized message
        """
        content = message.get("content", "")
        
        # If already under budget, return as is
        if self.estimate_tokens(content) <= token_budget:
            return message
            
        # Determine optimization level based on budget vs. current size
        current_tokens = self.estimate_tokens(content)
        ratio = token_budget / current_tokens
        
        if ratio < 0.3:
            # Aggressive summarization needed
            new_content = self._aggressive_summarize(content, token_budget)
        elif ratio < 0.7:
            # Medium compression
            new_content = self._compress_content(content, token_budget)
        else:
            # Light compression
            new_content = self._light_compress(content, token_budget)
            
        return {
            "role": message.get("role", "assistant"),
            "content": new_content
        }
    
    def _aggressive_summarize(self, content: str, token_budget: int) -> str:
        """
        Aggressively summarize content to fit in a small token budget.
        
        Args:
            content: Original content
            token_budget: Maximum tokens to use
            
        Returns:
            Summarized content
        """
        # Remove code blocks completely but note their existence
        code_blocks = re.findall(r'```[\s\S]*?```', content)
        has_code = len(code_blocks) > 0
        
        # Remove code blocks and extract key points
        clean_content = re.sub(r'```[\s\S]*?```', '', content)
        
        # Extract sentences (simplistic approach)
        sentences = re.split(r'(?<=[.!?])\s+', clean_content)
        
        # Take first and last sentence if multiple exist
        if len(sentences) > 2:
            key_sentences = [sentences[0], sentences[-1]]
        else:
            key_sentences = sentences
            
        # Join with a placeholder
        summary = " ... ".join(key_sentences)
        
        # Add note about code if present
        if has_code:
            summary += " [Contains code examples that were omitted]"
            
        # Final check to ensure we're under budget
        if self.estimate_tokens(summary) > token_budget:
            summary = summary[:token_budget * 4]  # Approximate token to char conversion
            
        return summary
    
    def _compress_content(self, content: str, token_budget: int) -> str:
        """
        Compress content with moderate summarization.
        
        Args:
            content: Original content
            token_budget: Maximum tokens to use
            
        Returns:
            Compressed content
        """
        # Try to preserve code blocks but truncate long ones
        code_blocks = re.findall(r'```[\s\S]*?```', content)
        code_block_placeholders = []
        
        for i, block in enumerate(code_blocks):
            placeholder = f"[CODE_BLOCK_{i}]"
            code_block_placeholders.append((placeholder, block))
            content = content.replace(block, placeholder, 1)
            
        # Compress paragraphs
        paragraphs = content.split("\n\n")
        compressed_paragraphs = []
        
        remaining_tokens = token_budget
        tokens_per_para = remaining_tokens // len(paragraphs)
        
        for para in paragraphs:
            para_tokens = self.estimate_tokens(para)
            
            if para_tokens <= tokens_per_para:
                # Can keep this paragraph as is
                compressed_paragraphs.append(para)
                remaining_tokens -= para_tokens
            else:
                # Need to compress this paragraph
                sentences = re.split(r'(?<=[.!?])\s+', para)
                if len(sentences) <= 2:
                    # Keep at least the first sentence
                    compressed_para = sentences[0]
                else:
                    # Keep first and last sentence
                    compressed_para = f"{sentences[0]} [...] {sentences[-1]}"
                    
                compressed_tokens = self.estimate_tokens(compressed_para)
                compressed_paragraphs.append(compressed_para)
                remaining_tokens -= compressed_tokens
                
        # Re-insert code blocks
        result = "\n\n".join(compressed_paragraphs)
        
        # Calculate remaining token budget for code blocks
        for placeholder, block in code_block_placeholders:
            block_tokens = self.estimate_tokens(block)
            
            if block_tokens <= remaining_tokens:
                # Can keep this code block as is
                result = result.replace(placeholder, block)
                remaining_tokens -= block_tokens
            else:
                # Need to truncate this code block
                truncated_block = self._truncate_code_block(block, remaining_tokens)
                result = result.replace(placeholder, truncated_block)
                remaining_tokens -= self.estimate_tokens(truncated_block)
                
        return result
    
    def _light_compress(self, content: str, token_budget: int) -> str:
        """
        Lightly compress content to fit within token budget.
        
        Args:
            content: Original content
            token_budget: Maximum tokens to use
            
        Returns:
            Lightly compressed content
        """
        current_tokens = self.estimate_tokens(content)
        
        if current_tokens <= token_budget:
            return content
            
        # Preserve most of the content, just trim as needed
        # Calculate how much we need to trim
        excess_tokens = current_tokens - token_budget
        
        # Estimate character count to trim (approximate conversion)
        chars_to_trim = excess_tokens * 4
        
        # Trim from the middle, keeping beginning and end
        keep_start = (len(content) - chars_to_trim) // 2
        keep_end = len(content) - chars_to_trim - keep_start
        
        if keep_start < len(content) // 3:
            # Too much trimming needed from the middle, just truncate the end
            return content[:token_budget * 4 - 10] + " [...]"
        else:
            return content[:keep_start] + " [...] " + content[-keep_end:]
    
    def _truncate_code_block(self, code_block: str, token_budget: int) -> str:
        """
        Truncate a code block to fit within token budget.
        
        Args:
            code_block: Original code block
            token_budget: Maximum tokens to use
            
        Returns:
            Truncated code block
        """
        # Extract language and code content
        match = re.match(r'```(\w*)\n([\s\S]*?)```', code_block)
        
        if not match:
            # Not a proper code block
            return "```\n[Code omitted for brevity]\n```"
            
        language, code = match.groups()
        
        # If already under budget, return as is
        if self.estimate_tokens(code_block) <= token_budget:
            return code_block
            
        # Calculate how many lines we can keep
        lines = code.split('\n')
        
        # Always keep first and last line if multiple lines
        if len(lines) > 2:
            # Estimate tokens per line (average)
            tokens_per_line = self.estimate_tokens(code) / len(lines)
            
            # Calculate how many lines we can keep excluding first and last
            middle_lines_budget = token_budget - self.estimate_tokens(f"```{language}\n{lines[0]}\n{lines[-1]}\n```")
            middle_lines_count = int(middle_lines_budget / tokens_per_line)
            
            if middle_lines_count <= 0:
                # Can't keep any middle lines
                result = f"```{language}\n{lines[0]}\n[...]\n{lines[-1]}\n```"
            else:
                # Keep some middle lines
                middle_lines = lines[1:-1]
                
                if len(middle_lines) <= middle_lines_count:
                    # Can keep all middle lines
                    result = code_block
                else:
                    # Need to select middle lines
                    step = len(middle_lines) / middle_lines_count
                    indices = [int(i * step) for i in range(middle_lines_count)]
                    selected_middle = [middle_lines[i] for i in indices]
                    
                    if indices and indices[-1] < len(middle_lines) - 1:
                        # Add an ellipsis if we're not selecting the last middle line
                        selected_middle.append("...")
                        
                    result = f"```{language}\n{lines[0]}\n" + "\n".join(selected_middle) + f"\n{lines[-1]}\n```"
        else:
            # Only one or two lines, keep as is
            result = code_block
            
        return result
    
    def optimize_function_definitions(self, functions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Optimize function definitions for tool usage.
        
        Args:
            functions: List of function definitions
            
        Returns:
            Optimized function definitions
        """
        optimized_functions = []
        
        for func in functions:
            # Create a copy to avoid modifying the original
            optimized_func = dict(func)
            
            # Optimize description if present
            if "description" in optimized_func:
                desc = optimized_func["description"]
                # Remove redundant wording and excess whitespace
                desc = re.sub(r'\s+', ' ', desc).strip()
                # Remove phrases like "This function..."
                desc = re.sub(r'^This (function|method|tool) ', '', desc)
                optimized_func["description"] = desc
                
            # Optimize parameters if present
            if "parameters" in optimized_func and isinstance(optimized_func["parameters"], dict):
                params = optimized_func["parameters"]
                
                # Optimize property descriptions
                if "properties" in params and isinstance(params["properties"], dict):
                    for prop_name, prop in params["properties"].items():
                        if "description" in prop:
                            prop_desc = prop["description"]
                            # Optimize property description
                            prop_desc = re.sub(r'\s+', ' ', prop_desc).strip()
                            prop_desc = re.sub(r'^The ', '', prop_desc)
                            prop["description"] = prop_desc
                            
            optimized_functions.append(optimized_func)
            
        return optimized_functions 