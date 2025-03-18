"""Base Agent module for all data management agents."""

import abc
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from azure.cosmos import CosmosClient, ContainerProxy


class BaseAgent(abc.ABC):
    """Base class for all data management agents in the Supertrack AI Platform.
    
    This abstract class defines common functionality and interfaces that all
    specialized agents must implement. It provides core capabilities for
    agent identification, state management, logging, and event handling.
    """
    
    def __init__(
        self,
        agent_id: Optional[str] = None,
        agent_type: str = "base",
        config: Optional[Dict[str, Any]] = None,
        cosmos_client: Optional[CosmosClient] = None,
        cosmos_database_id: Optional[str] = None,
        cosmos_container_id: Optional[str] = None,
    ):
        """Initialize a new agent instance.
        
        Args:
            agent_id: Unique identifier for this agent instance. If None, a UUID will be generated.
            agent_type: Type identifier for this agent (e.g., "metadata", "connector", etc.).
            config: Configuration dictionary for this agent.
            cosmos_client: CosmosDB client for state persistence. If None, state will not be persisted.
            cosmos_database_id: CosmosDB database ID for state persistence.
            cosmos_container_id: CosmosDB container ID for state persistence.
        """
        self.agent_id = agent_id or str(uuid.uuid4())
        self.agent_type = agent_type
        self.config = config or {}
        self.created_at = datetime.utcnow()
        self.last_active_at = self.created_at
        self.status = "initialized"
        self.logger = self._setup_logger()
        
        # State persistence in CosmosDB
        self.cosmos_client = cosmos_client
        self.cosmos_database_id = cosmos_database_id
        self.cosmos_container_id = cosmos_container_id
        self.container = self._get_cosmos_container() if cosmos_client else None
        
        # Initialize state
        self.save_state()
    
    def _setup_logger(self) -> logging.Logger:
        """Set up a logger for this agent instance.
        
        Returns:
            A configured logger instance.
        """
        logger = logging.getLogger(f"agent.{self.agent_type}.{self.agent_id}")
        logger.setLevel(logging.INFO)
        return logger
    
    def _get_cosmos_container(self) -> Optional[ContainerProxy]:
        """Get the CosmosDB container for state persistence.
        
        Returns:
            ContainerProxy or None if no Cosmos client is available.
        """
        if not self.cosmos_client or not self.cosmos_database_id or not self.cosmos_container_id:
            return None
        
        try:
            database = self.cosmos_client.get_database_client(self.cosmos_database_id)
            return database.get_container_client(self.cosmos_container_id)
        except Exception as e:
            self.logger.error(f"Failed to get Cosmos container: {str(e)}")
            return None
    
    def get_state(self) -> Dict[str, Any]:
        """Get the current agent state as a dictionary.
        
        Returns:
            A dictionary representation of the agent's state.
        """
        return {
            "id": self.agent_id,
            "type": self.agent_type,
            "config": self.config,
            "created_at": self.created_at.isoformat(),
            "last_active_at": self.last_active_at.isoformat(),
            "status": self.status,
        }
    
    def save_state(self) -> bool:
        """Save the current agent state to the persistence store.
        
        Returns:
            True if state was successfully saved, False otherwise.
        """
        if not self.container:
            self.logger.debug("No Cosmos container available, state not persisted")
            return False
        
        try:
            state = self.get_state()
            self.container.upsert_item(body=state)
            return True
        except Exception as e:
            self.logger.error(f"Failed to save agent state: {str(e)}")
            return False
    
    def load_state(self, agent_id: str) -> bool:
        """Load agent state from the persistence store.
        
        Args:
            agent_id: ID of the agent state to load.
            
        Returns:
            True if state was successfully loaded, False otherwise.
        """
        if not self.container:
            self.logger.debug("No Cosmos container available, cannot load state")
            return False
        
        try:
            state = self.container.read_item(item=agent_id, partition_key=agent_id)
            self.agent_id = state["id"]
            self.agent_type = state["type"]
            self.config = state["config"]
            self.created_at = datetime.fromisoformat(state["created_at"])
            self.last_active_at = datetime.fromisoformat(state["last_active_at"])
            self.status = state["status"]
            return True
        except Exception as e:
            self.logger.error(f"Failed to load agent state: {str(e)}")
            return False
    
    def update_status(self, status: str) -> None:
        """Update the agent's status and last active timestamp.
        
        Args:
            status: New status string for the agent.
        """
        self.status = status
        self.last_active_at = datetime.utcnow()
        self.save_state()
        self.logger.info(f"Status updated to: {status}")
    
    def log_activity(self, activity: str, level: str = "info", details: Optional[Dict[str, Any]] = None) -> None:
        """Log an agent activity with the specified level.
        
        Args:
            activity: Description of the activity being logged.
            level: Log level (debug, info, warning, error, critical).
            details: Optional dictionary with additional details.
        """
        log_data = {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "activity": activity,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if details:
            log_data.update(details)
        
        message = f"[{self.agent_type}] {activity}"
        
        if level == "debug":
            self.logger.debug(message, extra=log_data)
        elif level == "info":
            self.logger.info(message, extra=log_data)
        elif level == "warning":
            self.logger.warning(message, extra=log_data)
        elif level == "error":
            self.logger.error(message, extra=log_data)
        elif level == "critical":
            self.logger.critical(message, extra=log_data)
    
    @abc.abstractmethod
    async def process_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task assigned to this agent.
        
        Args:
            task: The task definition as a dictionary.
            
        Returns:
            A dictionary containing the task result or status.
        """
        pass
    
    @abc.abstractmethod
    async def handle_event(self, event: Dict[str, Any]) -> None:
        """Handle an event received by this agent.
        
        Args:
            event: The event data as a dictionary.
        """
        pass 