"""Event system for inter-agent communication."""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Callable, Awaitable

from azure.servicebus import ServiceBusClient, ServiceBusMessage
from azure.cosmos import CosmosClient, ContainerProxy


class EventType:
    """Event type constants for the agent system."""
    
    # System events
    AGENT_REGISTERED = "agent.registered"
    AGENT_DEREGISTERED = "agent.deregistered"
    AGENT_STATUS_CHANGED = "agent.status_changed"
    
    # Task events
    TASK_CREATED = "task.created"
    TASK_ASSIGNED = "task.assigned"
    TASK_STARTED = "task.started"
    TASK_COMPLETED = "task.completed"
    TASK_FAILED = "task.failed"
    
    # Workflow events
    WORKFLOW_CREATED = "workflow.created"
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    WORKFLOW_STEP_COMPLETED = "workflow.step.completed"
    
    # Connector events
    CONNECTOR_CREATED = "connector.created"
    CONNECTOR_UPDATED = "connector.updated"
    CONNECTOR_DELETED = "connector.deleted"
    CONNECTOR_FAILED = "connector.failed"
    CONNECTOR_RECOVERED = "connector.recovered"
    
    # Pipeline events
    PIPELINE_CREATED = "pipeline.created"
    PIPELINE_UPDATED = "pipeline.updated"
    PIPELINE_DELETED = "pipeline.deleted"
    PIPELINE_STARTED = "pipeline.started"
    PIPELINE_COMPLETED = "pipeline.completed"
    PIPELINE_FAILED = "pipeline.failed"
    
    # Schema events
    SCHEMA_CREATED = "schema.created"
    SCHEMA_UPDATED = "schema.updated"
    SCHEMA_DELETED = "schema.deleted"
    
    # Knowledge graph events
    KNOWLEDGE_GRAPH_UPDATED = "knowledge_graph.updated"
    ENTITY_CREATED = "knowledge_graph.entity.created"
    RELATIONSHIP_CREATED = "knowledge_graph.relationship.created"
    
    # Data query events
    QUERY_MISSING_DATA = "query.missing_data"
    QUERY_ANSWERED = "query.answered"
    QUERY_FAILED = "query.failed"


class EventBus:
    """Event bus for inter-agent communication using Azure Service Bus.
    
    This class provides publish-subscribe functionality for events in the agent system.
    It uses Azure Service Bus topics and subscriptions to deliver events to interested agents.
    """
    
    def __init__(
        self,
        servicebus_connection_string: str,
        topic_name: str,
        subscription_name: Optional[str] = None,
        event_store_client: Optional[CosmosClient] = None,
        event_store_database: Optional[str] = None,
        event_store_container: Optional[str] = None,
    ):
        """Initialize the event bus.
        
        Args:
            servicebus_connection_string: Azure Service Bus connection string
            topic_name: Name of the Service Bus topic for events
            subscription_name: Name of the subscription to create (defaults to a random UUID)
            event_store_client: Optional CosmosDB client for event persistence
            event_store_database: CosmosDB database for event persistence
            event_store_container: CosmosDB container for event persistence
        """
        self.servicebus_connection_string = servicebus_connection_string
        self.topic_name = topic_name
        self.subscription_name = subscription_name or f"sub-{str(uuid.uuid4())}"
        
        # For event persistence
        self.event_store_client = event_store_client
        self.event_store_database = event_store_database
        self.event_store_container = event_store_container
        self.event_store = self._get_event_store()
        
        # For event handlers
        self.handlers: Dict[str, List[Callable[[Dict[str, Any]], Awaitable[None]]]] = {}
        self.subscribed_event_types: Set[str] = set()
    
    def _get_event_store(self) -> Optional[ContainerProxy]:
        """Get the event store container from CosmosDB.
        
        Returns:
            ContainerProxy for the event store or None if not configured.
        """
        if not (self.event_store_client and self.event_store_database and self.event_store_container):
            return None
        
        try:
            database = self.event_store_client.get_database_client(self.event_store_database)
            return database.get_container_client(self.event_store_container)
        except Exception as e:
            print(f"Failed to get event store container: {str(e)}")
            return None
    
    async def publish_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        correlation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Publish an event to the Service Bus topic.
        
        Args:
            event_type: Type of event (use EventType constants)
            payload: Event payload data
            correlation_id: Optional correlation ID for tracking related events
            metadata: Optional metadata for the event
            
        Returns:
            The ID of the published event
        """
        event_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        event = {
            "id": event_id,
            "type": event_type,
            "timestamp": timestamp,
            "correlation_id": correlation_id or event_id,
            "payload": payload,
            "metadata": metadata or {},
        }
        
        # Persist event if event store is configured
        if self.event_store:
            try:
                self.event_store.create_item(body=event)
            except Exception as e:
                print(f"Failed to persist event: {str(e)}")
        
        # Publish to Service Bus
        servicebus_client = ServiceBusClient.from_connection_string(
            conn_str=self.servicebus_connection_string,
        )
        
        async with servicebus_client:
            sender = servicebus_client.get_topic_sender(topic_name=self.topic_name)
            async with sender:
                # Create and send a message
                message = ServiceBusMessage(
                    body=json.dumps(event).encode("utf-8"),
                    correlation_id=correlation_id,
                    subject=event_type,
                    message_id=event_id,
                )
                await sender.send_messages(message)
        
        return event_id
    
    async def subscribe(
        self,
        event_types: List[str],
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
    ) -> None:
        """Subscribe to one or more event types.
        
        Args:
            event_types: List of event types to subscribe to
            handler: Async function to call when an event is received
        """
        for event_type in event_types:
            if event_type not in self.handlers:
                self.handlers[event_type] = []
            self.handlers[event_type].append(handler)
            self.subscribed_event_types.add(event_type)
    
    async def start_listening(self) -> None:
        """Start listening for events on the Service Bus subscription.
        
        This method should be called after subscribing to events.
        It will continuously receive messages and dispatch them to registered handlers.
        """
        if not self.subscribed_event_types:
            print("Warning: No event types subscribed, listening will not receive any events")
        
        # Create a rule filter based on the subscribed event types
        rule_filter = " OR ".join([f"subject = '{event_type}'" for event_type in self.subscribed_event_types])
        
        servicebus_client = ServiceBusClient.from_connection_string(
            conn_str=self.servicebus_connection_string,
        )
        
        # Start listening for messages
        async with servicebus_client:
            receiver = servicebus_client.get_subscription_receiver(
                topic_name=self.topic_name,
                subscription_name=self.subscription_name,
            )
            
            async with receiver:
                while True:
                    try:
                        messages = await receiver.receive_messages(max_message_count=10, max_wait_time=5)
                        
                        for message in messages:
                            # Process the message
                            event_str = message.body.decode("utf-8")
                            event = json.loads(event_str)
                            event_type = event["type"]
                            
                            # Dispatch to handlers
                            if event_type in self.handlers:
                                for handler in self.handlers[event_type]:
                                    try:
                                        await handler(event)
                                    except Exception as e:
                                        print(f"Error in event handler: {str(e)}")
                            
                            # Complete the message to remove it from the queue
                            await receiver.complete_message(message)
                    
                    except Exception as e:
                        print(f"Error receiving messages: {str(e)}")
    
    async def get_event_history(
        self,
        event_types: Optional[List[str]] = None,
        correlation_id: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get event history from the event store.
        
        Args:
            event_types: Optional list of event types to filter by
            correlation_id: Optional correlation ID to filter by
            start_time: Optional start time in ISO format
            end_time: Optional end time in ISO format
            limit: Maximum number of events to return
            
        Returns:
            List of events matching the criteria
        """
        if not self.event_store:
            return []
        
        query_parts = ["SELECT * FROM c WHERE 1=1"]
        query_params = []
        
        # Add filters
        if event_types:
            placeholders = ", ".join([f"@eventType{i}" for i in range(len(event_types))])
            query_parts.append(f"AND c.type IN ({placeholders})")
            for i, event_type in enumerate(event_types):
                query_params.append({"name": f"@eventType{i}", "value": event_type})
        
        if correlation_id:
            query_parts.append("AND c.correlation_id = @correlationId")
            query_params.append({"name": "@correlationId", "value": correlation_id})
        
        if start_time:
            query_parts.append("AND c.timestamp >= @startTime")
            query_params.append({"name": "@startTime", "value": start_time})
        
        if end_time:
            query_parts.append("AND c.timestamp <= @endTime")
            query_params.append({"name": "@endTime", "value": end_time})
        
        # Add ordering and limit
        query_parts.append("ORDER BY c.timestamp DESC")
        query = " ".join(query_parts)
        
        try:
            items = list(self.event_store.query_items(
                query=query,
                parameters=query_params,
                max_item_count=limit,
            ))
            return items
        except Exception as e:
            print(f"Failed to query event history: {str(e)}")
            return [] 