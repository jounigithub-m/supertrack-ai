# Supertrack AI Platform - Backend

This directory contains the backend implementation for the Supertrack AI Platform, built with Azure Functions, Python, and various AI/ML components.

## Directory Structure

```
backend/
├── functions/           # Azure Functions organized by domain
│   ├── auth/            # Authentication and authorization functions
│   ├── tenant/          # Tenant management functions
│   ├── database/        # Database access functions
│   ├── llm/             # LLM provider abstraction layer
│   ├── embedding/       # Embedding generation services
│   ├── query/           # Query processing system
│   ├── response/        # Response generation service
│   ├── connectors/      # Data source connector framework
│   ├── etl/             # ETL processing pipeline
│   ├── document/        # Document processing pipeline
│   ├── cmp/             # Context Model Protocol implementation
│   ├── retrieval/       # Hybrid retrieval system
│   ├── reranking/       # Neural reranking system
│   └── feedback/        # Feedback and learning system
├── shared/              # Shared code used across functions
│   ├── models/          # Data models and schemas
│   ├── middlewares/     # Middleware components
│   ├── db/              # Database connection and helpers
│   ├── config/          # Configuration management
│   └── constants/       # Constant values and enums
├── utils/               # Utility functions and helpers
│   ├── logger/          # Logging utilities
│   ├── validators/      # Input validation utilities
│   └── helpers/         # General helper functions
├── tests/               # Test suite
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
└── requirements.txt     # Python dependencies
```

## LLM Optimizations

The backend implements several optimizations for LLM operations to improve performance, reduce costs, and enhance efficiency:

### Semantic Caching

The semantic caching system enables reuse of results for semantically similar queries:

- Uses embedding-based similarity to detect when a new query is semantically similar to a previous one
- Configurable similarity threshold (default: 0.92)
- Multiple cache levels (memory and Redis) for optimal performance
- Automatic cache invalidation with configurable TTLs

### Batched Embedding Generation

The embedding service includes batched processing for efficiency:

- Processes multiple text inputs in a single API call
- Concurrent processing with configurable batch sizes
- Automatic retry with exponential backoff
- Rate limit handling
- Optimizes API usage to reduce costs

### Prompt Optimization for Token Efficiency

Prompt optimization reduces token usage while maintaining effectiveness:

- Optimizes long conversation histories while preserving important context
- Implements adaptive compression based on token budget
- Maintains system messages and recent user queries
- Optimizes function definitions for function calling
- Preserves code blocks when possible

## Setup and Development

### Prerequisites

- Python 3.10+
- Azure Functions Core Tools
- Azure CLI

### Local Development Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up local settings:
   ```
   cp local.settings.json.example local.settings.json
   # Edit local.settings.json with your configuration
   ```

4. Run functions locally:
   ```
   func start
   ```

### Development Guidelines

- Follow PEP 8 style guide for Python code
- Write docstrings for all functions, classes, and modules
- Implement unit tests for new functionality
- Ensure proper error handling and logging
- Maintain strict tenant isolation in all operations

## Deployment

The backend is deployed to Azure Functions through the GitHub Actions CI/CD pipeline. See the root README.md for more information on the deployment process. 