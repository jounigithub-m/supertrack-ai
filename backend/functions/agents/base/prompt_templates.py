"""Prompt templates for agent-LLM interactions."""

import os
import json
from typing import Any, Dict, List, Optional, Union
from jinja2 import Environment, BaseLoader


class PromptTemplate:
    """Template for generating prompts for LLM interactions.
    
    This class uses Jinja2 templating to generate structured prompts for
    different agent operations.
    """
    
    def __init__(self, template_str: str):
        """Initialize the prompt template.
        
        Args:
            template_str: Jinja2 template string
        """
        self.env = Environment(loader=BaseLoader())
        self.template = self.env.from_string(template_str)
    
    def render(self, **kwargs) -> str:
        """Render the template with the provided variables.
        
        Args:
            **kwargs: Variables to use in template rendering
            
        Returns:
            Rendered template string
        """
        return self.template.render(**kwargs)


# System prompts for different agent types
METADATA_AGENT_SYSTEM_PROMPT = """You are a Metadata Extraction Agent in the Supertrack AI Platform.
Your role is to analyze data sources, detect schema changes, and update metadata repositories.

Key responsibilities:
1. Analyze user queries to identify missing data elements
2. Extract schema information from API responses and error messages
3. Design data models for newly discovered data sources
4. Maintain data dictionaries and relationship mappings
5. Update knowledge graph with new entity relationships

When analyzing schemas, be thorough and precise. Consider not just the data types but also
relationships between entities, constraints, cardinality, and business meaning.

Always output valid JSON schemas that follow standardized conventions.
"""

CONNECTOR_AGENT_SYSTEM_PROMPT = """You are a Connector Management Agent in the Supertrack AI Platform.
Your role is to build, test, and maintain data source connectors.

Key responsibilities:
1. Monitor connector health and detect failures
2. Analyze API documentation and response formats
3. Generate and update connector code for data sources
4. Create authentication and rate limiting implementations
5. Diagnose connector failures and implement fixes
6. Validate connector outputs against expected schemas

When writing connector code, follow these principles:
- Use proper error handling with specific error types
- Implement rate limiting and backoff strategies
- Add comprehensive logging for debugging
- Write clean, well-documented code following PEP 8
- Validate output data against schemas
- Use asynchronous patterns where appropriate
"""

PIPELINE_AGENT_SYSTEM_PROMPT = """You are a Pipeline Orchestration Agent in the Supertrack AI Platform.
Your role is to create and maintain data processing pipelines.

Key responsibilities:
1. Design ETL/ELT workflows for data transformation
2. Create data validation and quality checks
3. Configure pipeline schedules and triggers
4. Monitor pipeline execution metrics
5. Optimize pipeline performance
6. Implement incremental loading strategies

When designing pipelines:
- Use idempotent operations where possible
- Add appropriate checkpoints for recovery
- Include data quality validation steps
- Design for scale and performance
- Add appropriate monitoring and alerting
- Consider incremental vs. full load approaches
"""

KNOWLEDGE_GRAPH_AGENT_SYSTEM_PROMPT = """You are a Knowledge Graph Agent in the Supertrack AI Platform.
Your role is to maintain and extend the knowledge graph to represent data relationships.

Key responsibilities:
1. Create entity-relationship mappings from data models
2. Update Neo4j schema when new entities are discovered
3. Generate graph queries for data verification
4. Optimize graph structure for query performance
5. Ensure consistency between graph and relational models

When working with knowledge graphs:
- Use appropriate relationship types and directionality
- Create indexes for performance optimization
- Design property graph models that represent business concepts
- Write efficient Cypher queries
- Maintain proper constraints and unique identifiers
- Consider graph traversal performance
"""

# Common task prompt templates
SCHEMA_ANALYSIS_PROMPT = PromptTemplate("""
# Schema Analysis Task

## Context
You need to analyze the following data and extract a formal schema definition.

## Data Information
Source Type: {{ source_type }}
Source Name: {{ source_name }}
Source Description: {{ description if description else 'No description provided' }}

## Data Content
```
{{ data_content }}
```

{% if existing_schema %}
## Existing Schema (if you're updating)
```json
{{ existing_schema }}
```
{% endif %}

## Task
1. Analyze the data content
2. Extract a formal JSON schema definition including:
   - Field names and data types
   - Required vs. optional fields
   - Nested objects and arrays
   - Field descriptions where possible
   - Data constraints or validation rules
3. Identify relationships to other entities if applicable
4. If updating an existing schema, clearly identify changes

## Output Format
Return a JSON object with the following structure:
```json
{
  "schemaDefinition": {
    // JSON Schema format
  },
  "changes": [
    // Array of changes if updating existing schema
    // Each change should include field name, type of change (added, modified, removed),
    // and description of change
  ],
  "relationships": [
    // Array of potential relationships to other entities
    // Each relationship should include target entity, relationship type,
    // and cardinality (one-to-one, one-to-many, many-to-many)
  ],
  "confidence": 0.95 // Confidence score (0.0-1.0) in the extraction
}
```
""")

CONNECTOR_ERROR_ANALYSIS_PROMPT = PromptTemplate("""
# Connector Error Analysis Task

## Context
A data connector has failed. You need to analyze the error and suggest fixes.

## Connector Information
Connector ID: {{ connector_id }}
Connector Type: {{ connector_type }}
Source System: {{ source_system }}

## Error Information
Error Message: {{ error_message }}
Error Timestamp: {{ error_timestamp }}
HTTP Status Code (if applicable): {{ http_status_code if http_status_code else 'N/A' }}

## Connector Code
```python
{{ connector_code }}
```

{% if error_context %}
## Additional Error Context
```
{{ error_context }}
```
{% endif %}

{% if api_documentation %}
## API Documentation Excerpt
```
{{ api_documentation }}
```
{% endif %}

## Task
1. Analyze the error message and context
2. Identify the root cause of the failure
3. Determine if this is a transient or persistent error
4. Suggest specific code changes to fix the issue
5. Recommend additional error handling or resilience measures

## Output Format
Return a JSON object with the following structure:
```json
{
  "rootCause": "Detailed description of what caused the error",
  "errorType": "AUTHENTICATION|RATE_LIMIT|SCHEMA_CHANGE|NETWORK|VALIDATION|OTHER",
  "persistence": "TRANSIENT|PERSISTENT",
  "codeChanges": [
    {
      "fileName": "connector.py",
      "lineNumber": 42,
      "originalCode": "...",
      "suggestedCode": "...",
      "explanation": "Why this change fixes the issue"
    }
  ],
  "additionalRecommendations": [
    "List of additional recommendations for improving connector resilience"
  ],
  "confidence": 0.85 // Confidence score (0.0-1.0) in the analysis
}
```
""")

PIPELINE_DESIGN_PROMPT = PromptTemplate("""
# Pipeline Design Task

## Context
You need to design a data processing pipeline for the given source and destination.

## Source Information
Source Type: {{ source_type }}
Source Schema:
```json
{{ source_schema }}
```
Update Frequency: {{ update_frequency }}
Estimated Volume: {{ estimated_volume if estimated_volume else 'Unknown' }}

## Destination Information
Destination Type: {{ destination_type }}
Destination Schema:
```json
{{ destination_schema }}
```

## Transformation Requirements
{{ transformation_requirements }}

{% if existing_pipeline %}
## Existing Pipeline (if updating)
```python
{{ existing_pipeline }}
```
{% endif %}

## Task
1. Design a pipeline that efficiently moves data from source to destination
2. Include all necessary transformations to match destination schema
3. Implement data quality checks and validation
4. Configure appropriate scheduling/triggering based on update frequency
5. Optimize for performance and reliability
6. Include appropriate error handling and recovery mechanisms

## Output Format
Return a JSON object with the following structure:
```json
{
  "pipelineDesign": {
    "steps": [
      {
        "type": "EXTRACT|TRANSFORM|LOAD|VALIDATE",
        "name": "Step name",
        "description": "Step description",
        "implementation": "Python code for this step",
        "dependencies": ["Names of steps this depends on"]
      }
    ],
    "schedule": {
      "type": "CRON|FREQUENCY|EVENT",
      "value": "Schedule specification"
    },
    "errorHandling": {
      "retryStrategy": "Retry strategy details",
      "failureHandling": "What happens on failure"
    }
  },
  "explanation": "Explanation of the pipeline design choices",
  "optimizationNotes": ["Notes on performance optimization"]
}
```
""")

KNOWLEDGE_GRAPH_UPDATE_PROMPT = PromptTemplate("""
# Knowledge Graph Update Task

## Context
You need to update the Neo4j knowledge graph based on new schema information.

## New Schema
```json
{{ new_schema }}
```

## Entity Name
{{ entity_name }}

{% if existing_cypher %}
## Existing Cypher Schema Definition
```cypher
{{ existing_cypher }}
```
{% endif %}

{% if related_entities %}
## Related Entities
{% for entity in related_entities %}
- {{ entity.name }} (relationship: {{ entity.relationship }})
{% endfor %}
{% endif %}

## Task
1. Create or update Neo4j schema definitions for this entity
2. Define appropriate node labels, properties, and constraints
3. Create relationship types for connected entities
4. Update indexes for performance optimization
5. Provide migration steps if updating existing schema

## Output Format
Return a JSON object with the following structure:
```json
{
  "cypherStatements": [
    {
      "purpose": "Create constraints",
      "statement": "CREATE CONSTRAINT ... ON (n:Label) ...",
      "runOrder": 1
    },
    {
      "purpose": "Create indexes",
      "statement": "CREATE INDEX ... FOR (n:Label) ...",
      "runOrder": 2
    },
    {
      "purpose": "Define relationships",
      "statement": "MATCH ... CREATE RELATIONSHIP ...",
      "runOrder": 3
    }
  ],
  "migrationNotes": "Notes on migrating existing data",
  "indexingStrategy": "Explanation of indexing choices",
  "queryExamples": [
    {
      "purpose": "Find related entities",
      "query": "MATCH (n:Label)-[:RELATIONSHIP]->(m) RETURN m"
    }
  ]
}
```
""")

# Create a dictionary mapping template names to template objects
TEMPLATES = {
    "schema_analysis": SCHEMA_ANALYSIS_PROMPT,
    "connector_error_analysis": CONNECTOR_ERROR_ANALYSIS_PROMPT,
    "pipeline_design": PIPELINE_DESIGN_PROMPT,
    "knowledge_graph_update": KNOWLEDGE_GRAPH_UPDATE_PROMPT,
}

# System prompts by agent type
SYSTEM_PROMPTS = {
    "metadata": METADATA_AGENT_SYSTEM_PROMPT,
    "connector": CONNECTOR_AGENT_SYSTEM_PROMPT,
    "pipeline": PIPELINE_AGENT_SYSTEM_PROMPT,
    "knowledge": KNOWLEDGE_GRAPH_AGENT_SYSTEM_PROMPT,
}


def get_template(template_name: str) -> Optional[PromptTemplate]:
    """Get a prompt template by name.
    
    Args:
        template_name: Name of the template to retrieve
        
    Returns:
        PromptTemplate object or None if not found
    """
    return TEMPLATES.get(template_name)


def get_system_prompt(agent_type: str) -> str:
    """Get the system prompt for an agent type.
    
    Args:
        agent_type: Type of agent (metadata, connector, pipeline, knowledge)
        
    Returns:
        System prompt string
    """
    return SYSTEM_PROMPTS.get(agent_type, "") 