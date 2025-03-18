"""Data management agent framework for the Supertrack AI Platform.

This module provides various data management agent types that work together
to create a self-healing data ecosystem with automatic schema discovery and
intelligent connector recovery.
"""

# Import base components
from .base.base_agent import BaseAgent
from .base.event_system import EventBus, EventType
from .base.workflow_manager import WorkflowManager, WorkflowStatus, StepStatus
from .base.llm_client import LLMClient

# Import agent implementations
from .metadata import MetadataAgent

# Define agent types
AGENT_TYPE_METADATA = "metadata"
AGENT_TYPE_CONNECTOR = "connector"  
AGENT_TYPE_PIPELINE = "pipeline"
AGENT_TYPE_KNOWLEDGE = "knowledge"

# Define workflow types
WORKFLOW_TYPE_CONNECTOR_HEALING = "connector_healing"
WORKFLOW_TYPE_SCHEMA_EXPANSION = "schema_expansion"
WORKFLOW_TYPE_KNOWLEDGE_GRAPH_UPDATE = "knowledge_graph_update"
WORKFLOW_TYPE_QUERY_RESOLUTION = "query_resolution" 