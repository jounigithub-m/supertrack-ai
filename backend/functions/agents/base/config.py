"""Configuration management for the data management agent framework."""

import os
import json
from typing import Any, Dict, Optional, Union, List, Set

from azure.cosmos import CosmosClient

# Default configuration
DEFAULT_CONFIG = {
    # Database settings
    "cosmos_endpoint": "",
    "cosmos_key": "",
    "cosmos_database_id": "supertrack-agents",
    "cosmos_agents_container_id": "agents",
    "cosmos_workflows_container_id": "workflows",
    "cosmos_workflow_steps_container_id": "workflow-steps",
    "cosmos_events_container_id": "events",
    "cosmos_metadata_container_id": "metadata",
    "cosmos_connectors_container_id": "connectors",
    "cosmos_connector_versions_container_id": "connector-versions",
    "cosmos_pipelines_container_id": "pipelines",
    "cosmos_pipeline_versions_container_id": "pipeline-versions",
    "cosmos_schema_registry_container_id": "schema-registry",
    "cosmos_schema_versions_container_id": "schema-versions",
    "cosmos_knowledge_graph_updates_container_id": "knowledge-graph-updates",
    
    # Event system settings
    "servicebus_connection_string": "",
    "servicebus_topic_name": "agent-events",
    
    # Neo4j settings
    "neo4j_uri": "",
    "neo4j_user": "",
    "neo4j_password": "",
    
    # ADLS settings
    "adls_account_name": "",
    "adls_account_key": "",
    "adls_container_name": "agent-code",
    
    # LLM settings
    "llm_provider": "azure-openai",  # "azure-openai", "openai", or "together"
    "llm_api_key": "",
    "llm_api_base": "",
    "llm_api_version": "2023-05-15",
    "llm_deployment_id": "",
    "llm_together_api_key": "",
    "llm_model_name": "gpt-4",
    "llm_timeout": 120,
    "llm_max_tokens": 4000,
    "llm_temperature": 0.0,
    
    # Agent settings
    "agent_task_timeout_seconds": 600,
    "agent_max_retries": 3,
    "agent_retry_delay_seconds": 60,
    
    # Workflow settings
    "workflow_max_steps": 20,
    "workflow_default_timeout_seconds": 3600,
    
    # Code generation settings
    "code_generation_max_attempts": 3,
    "code_generation_max_tokens": 8000,
    "code_validation_enabled": True,
    
    # Connector testing settings
    "connector_test_enabled": True,
    "connector_test_timeout_seconds": 300,
    
    # Feature flags
    "feature_self_healing_enabled": True,
    "feature_schema_expansion_enabled": True,
    "feature_knowledge_graph_update_enabled": True,
    "feature_code_freezing_enabled": True,
}


class AgentConfig:
    """Configuration manager for the data management agent framework."""
    
    def __init__(self, config_override: Optional[Dict[str, Any]] = None):
        """Initialize the configuration manager.
        
        Args:
            config_override: Optional dictionary to override default configuration
        """
        self.config = DEFAULT_CONFIG.copy()
        
        # Override with environment variables
        self._load_from_env()
        
        # Override with provided configuration
        if config_override:
            self.config.update(config_override)
    
    def _load_from_env(self) -> None:
        """Load configuration from environment variables."""
        for key in self.config:
            env_key = f"AGENT_{key.upper()}"
            env_value = os.environ.get(env_key)
            
            if env_value:
                # Convert string values to appropriate types
                if isinstance(self.config[key], bool):
                    self.config[key] = env_value.lower() in ("true", "1", "yes")
                elif isinstance(self.config[key], int):
                    self.config[key] = int(env_value)
                elif isinstance(self.config[key], float):
                    self.config[key] = float(env_value)
                else:
                    self.config[key] = env_value
    
    def get(self, key: str, default: Optional[Any] = None) -> Any:
        """Get a configuration value.
        
        Args:
            key: Configuration key
            default: Default value if key is not found
            
        Returns:
            Configuration value
        """
        return self.config.get(key, default)
    
    def set(self, key: str, value: Any) -> None:
        """Set a configuration value.
        
        Args:
            key: Configuration key
            value: Configuration value
        """
        self.config[key] = value
    
    def get_cosmos_client(self) -> Optional[CosmosClient]:
        """Get a CosmosDB client using the current configuration.
        
        Returns:
            CosmosClient instance or None if connection details are missing
        """
        endpoint = self.get("cosmos_endpoint")
        key = self.get("cosmos_key")
        
        if not endpoint or not key:
            return None
        
        return CosmosClient(endpoint, key)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to a dictionary.
        
        Returns:
            Dictionary representation of the configuration
        """
        return self.config.copy()
    
    def validate(self) -> Dict[str, str]:
        """Validate the configuration.
        
        Returns:
            Dictionary mapping configuration keys to error messages for invalid settings
        """
        errors = {}
        
        # Validate required settings
        required_settings = [
            "cosmos_endpoint",
            "cosmos_key",
            "servicebus_connection_string",
            "servicebus_topic_name",
        ]
        
        for key in required_settings:
            if not self.get(key):
                errors[key] = f"Missing required setting: {key}"
        
        # Validate LLM settings based on provider
        llm_provider = self.get("llm_provider")
        
        if llm_provider == "azure-openai":
            if not self.get("llm_api_key"):
                errors["llm_api_key"] = "Missing Azure OpenAI API key"
            if not self.get("llm_api_base"):
                errors["llm_api_base"] = "Missing Azure OpenAI API base URL"
            if not self.get("llm_deployment_id"):
                errors["llm_deployment_id"] = "Missing Azure OpenAI deployment ID"
        
        elif llm_provider == "openai":
            if not self.get("llm_api_key"):
                errors["llm_api_key"] = "Missing OpenAI API key"
        
        elif llm_provider == "together":
            if not self.get("llm_together_api_key"):
                errors["llm_together_api_key"] = "Missing Together.ai API key"
        
        else:
            errors["llm_provider"] = f"Unsupported LLM provider: {llm_provider}"
        
        return errors 