"""
Tests for LLM optimizations.
"""
import pytest

from functions.llm.prompt_optimizer import PromptOptimizer
from functions.embedding.batch_processor import BatchEmbeddingProcessor


class TestPromptOptimizer:
    """Tests for the prompt optimizer."""
    
    def test_token_estimation(self):
        """Test token estimation functionality."""
        optimizer = PromptOptimizer()
        
        # Test token estimation
        text = "This is a test message with approximately 16 tokens."
        estimated_tokens = optimizer.estimate_tokens(text)
        
        # Token estimations are approximate, this is just a sanity check
        assert 10 <= estimated_tokens <= 20
        
    def test_chat_message_optimization(self):
        """Test chat message optimization."""
        optimizer = PromptOptimizer()
        
        # Create a set of test messages
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "What is the capital of France?"},
            {"role": "assistant", "content": "The capital of France is Paris."},
            {"role": "user", "content": "What about Germany?"},
            {"role": "assistant", "content": "The capital of Germany is Berlin."},
            {"role": "user", "content": "And Italy?"}
        ]
        
        # Test with a small token limit
        optimized = optimizer.optimize_chat_messages(messages, max_tokens=20)
        assert len(optimized) <= len(messages)
        
        # Ensure system message is preserved
        assert optimized[0]["role"] == "system"
        
        # Ensure recent messages are preserved
        assert optimized[-1]["content"] == "And Italy?"


class TestBatchEmbeddingProcessor:
    """Tests for batch embedding processing."""
    
    def test_batch_creation(self):
        """Test batch creation logic."""
        processor = BatchEmbeddingProcessor(batch_size=5)
        
        texts = ["Text 1", "Text 2", "Text 3", "Text 4", "Text 5", "Text 6", "Text 7"]
        batches = processor._create_batches(texts)
        
        # Should create 2 batches
        assert len(batches) == 2
        assert len(batches[0]) == 5  # First batch should have 5 items
        assert len(batches[1]) == 2  # Second batch should have 2 items 