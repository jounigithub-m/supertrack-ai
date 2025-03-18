"""Workflow manager for orchestrating multi-step agent tasks."""

import json
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Callable, Awaitable

from azure.cosmos import CosmosClient, ContainerProxy

from .event_system import EventBus, EventType


class WorkflowStatus(str, Enum):
    """Status values for workflows."""
    CREATED = "created"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StepStatus(str, Enum):
    """Status values for workflow steps."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowManager:
    """Manager for creating and executing multi-step agent workflows.
    
    This class handles the creation, execution, and tracking of workflows
    that coordinate multiple agents to complete complex tasks.
    """
    
    def __init__(
        self,
        cosmos_client: CosmosClient,
        database_id: str,
        workflows_container_id: str,
        steps_container_id: str,
        event_bus: EventBus,
    ):
        """Initialize the workflow manager.
        
        Args:
            cosmos_client: CosmosDB client for workflow persistence
            database_id: CosmosDB database ID
            workflows_container_id: Container ID for workflow documents
            steps_container_id: Container ID for workflow step documents
            event_bus: EventBus instance for publishing workflow events
        """
        self.cosmos_client = cosmos_client
        self.database_id = database_id
        self.workflows_container_id = workflows_container_id
        self.steps_container_id = steps_container_id
        self.event_bus = event_bus
        
        # Initialize containers
        database = self.cosmos_client.get_database_client(self.database_id)
        self.workflows_container = database.get_container_client(self.workflows_container_id)
        self.steps_container = database.get_container_client(self.steps_container_id)
    
    async def create_workflow(
        self,
        name: str,
        description: str,
        workflow_type: str,
        input_data: Dict[str, Any],
        tenant_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new workflow.
        
        Args:
            name: Human-readable name for the workflow
            description: Detailed description of the workflow's purpose
            workflow_type: Type identifier for this workflow
            input_data: Initial input data for the workflow
            tenant_id: ID of the tenant this workflow belongs to
            metadata: Optional metadata for the workflow
            
        Returns:
            The created workflow document
        """
        workflow_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        workflow = {
            "id": workflow_id,
            "name": name,
            "description": description,
            "type": workflow_type,
            "status": WorkflowStatus.CREATED.value,
            "tenant_id": tenant_id,
            "input_data": input_data,
            "output_data": {},
            "metadata": metadata or {},
            "created_at": timestamp,
            "updated_at": timestamp,
            "started_at": None,
            "completed_at": None,
            "error": None,
        }
        
        # Create the workflow in Cosmos DB
        try:
            created_workflow = self.workflows_container.create_item(body=workflow)
            
            # Publish workflow created event
            await self.event_bus.publish_event(
                event_type=EventType.WORKFLOW_CREATED,
                payload={
                    "workflow_id": workflow_id,
                    "workflow_type": workflow_type,
                    "tenant_id": tenant_id,
                },
                metadata={
                    "name": name,
                    "description": description,
                },
            )
            
            return created_workflow
        
        except Exception as e:
            raise Exception(f"Failed to create workflow: {str(e)}")
    
    async def add_step(
        self,
        workflow_id: str,
        step_name: str,
        step_description: str,
        agent_type: str,
        task_data: Dict[str, Any],
        dependencies: Optional[List[str]] = None,
        timeout_seconds: Optional[int] = None,
        retry_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Add a step to a workflow.
        
        Args:
            workflow_id: ID of the workflow to add the step to
            step_name: Human-readable name for the step
            step_description: Detailed description of the step's purpose
            agent_type: Type of agent to execute this step
            task_data: Data to pass to the agent for this step
            dependencies: Optional list of step IDs this step depends on
            timeout_seconds: Optional timeout in seconds for this step
            retry_config: Optional retry configuration for this step
            
        Returns:
            The created workflow step document
        """
        step_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        step = {
            "id": step_id,
            "workflow_id": workflow_id,
            "name": step_name,
            "description": step_description,
            "agent_type": agent_type,
            "task_data": task_data,
            "dependencies": dependencies or [],
            "status": StepStatus.PENDING.value,
            "created_at": timestamp,
            "updated_at": timestamp,
            "scheduled_at": None,
            "started_at": None,
            "completed_at": None,
            "timeout_seconds": timeout_seconds,
            "retry_config": retry_config or {"max_retries": 3, "retry_interval_seconds": 60},
            "retry_count": 0,
            "result": None,
            "error": None,
        }
        
        # Create the step in Cosmos DB
        try:
            created_step = self.steps_container.create_item(body=step)
            return created_step
        
        except Exception as e:
            raise Exception(f"Failed to add workflow step: {str(e)}")
    
    async def start_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Start a workflow.
        
        Args:
            workflow_id: ID of the workflow to start
            
        Returns:
            The updated workflow document
        """
        # Get the workflow
        try:
            workflow = self.workflows_container.read_item(item=workflow_id, partition_key=workflow_id)
        except Exception as e:
            raise Exception(f"Failed to get workflow {workflow_id}: {str(e)}")
        
        if workflow["status"] != WorkflowStatus.CREATED.value:
            raise Exception(f"Workflow {workflow_id} is not in CREATED status")
        
        # Update workflow status
        timestamp = datetime.utcnow().isoformat()
        workflow["status"] = WorkflowStatus.RUNNING.value
        workflow["started_at"] = timestamp
        workflow["updated_at"] = timestamp
        
        # Update the workflow in Cosmos DB
        try:
            updated_workflow = self.workflows_container.replace_item(item=workflow_id, body=workflow)
            
            # Publish workflow started event
            await self.event_bus.publish_event(
                event_type=EventType.WORKFLOW_STARTED,
                payload={
                    "workflow_id": workflow_id,
                    "workflow_type": workflow["type"],
                    "tenant_id": workflow["tenant_id"],
                },
            )
            
            # Schedule the first steps (those with no dependencies)
            await self._schedule_ready_steps(workflow_id)
            
            return updated_workflow
        
        except Exception as e:
            raise Exception(f"Failed to start workflow: {str(e)}")
    
    async def _schedule_ready_steps(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Schedule steps that are ready to run (all dependencies satisfied).
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            List of scheduled step documents
        """
        # Get all steps for the workflow
        try:
            steps = list(self.steps_container.query_items(
                query="SELECT * FROM c WHERE c.workflow_id = @workflow_id",
                parameters=[{"name": "@workflow_id", "value": workflow_id}],
                enable_cross_partition_query=True,
            ))
        except Exception as e:
            raise Exception(f"Failed to get steps for workflow {workflow_id}: {str(e)}")
        
        # Create maps for easier lookup
        step_map = {step["id"]: step for step in steps}
        ready_steps = []
        
        # Find steps that are pending and have all dependencies satisfied
        for step in steps:
            if step["status"] != StepStatus.PENDING.value:
                continue
            
            # Check if all dependencies are completed
            dependencies_satisfied = True
            for dep_id in step["dependencies"]:
                if dep_id not in step_map:
                    raise Exception(f"Dependency {dep_id} not found for step {step['id']}")
                
                dep_step = step_map[dep_id]
                if dep_step["status"] != StepStatus.COMPLETED.value:
                    dependencies_satisfied = False
                    break
            
            if dependencies_satisfied:
                # Schedule this step
                timestamp = datetime.utcnow().isoformat()
                step["status"] = StepStatus.SCHEDULED.value
                step["scheduled_at"] = timestamp
                step["updated_at"] = timestamp
                
                try:
                    updated_step = self.steps_container.replace_item(item=step["id"], body=step)
                    ready_steps.append(updated_step)
                    
                    # Create a task for this step
                    await self._create_step_task(updated_step)
                
                except Exception as e:
                    raise Exception(f"Failed to schedule step {step['id']}: {str(e)}")
        
        return ready_steps
    
    async def _create_step_task(self, step: Dict[str, Any]) -> None:
        """Create a task for a workflow step.
        
        Args:
            step: The step document to create a task for
        """
        # Combine workflow and step information into task data
        try:
            workflow = self.workflows_container.read_item(
                item=step["workflow_id"],
                partition_key=step["workflow_id"],
            )
        except Exception as e:
            raise Exception(f"Failed to get workflow {step['workflow_id']} for step {step['id']}: {str(e)}")
        
        # Get results from dependency steps if needed
        dependency_results = {}
        for dep_id in step["dependencies"]:
            try:
                dep_step = self.steps_container.read_item(item=dep_id, partition_key=dep_id)
                dependency_results[dep_id] = dep_step.get("result", {})
            except Exception as e:
                raise Exception(f"Failed to get dependency {dep_id} for step {step['id']}: {str(e)}")
        
        # Create the task
        task = {
            "step_id": step["id"],
            "workflow_id": step["workflow_id"],
            "workflow_type": workflow["type"],
            "tenant_id": workflow["tenant_id"],
            "agent_type": step["agent_type"],
            "task_data": step["task_data"],
            "workflow_input": workflow["input_data"],
            "dependency_results": dependency_results,
            "timeout_seconds": step["timeout_seconds"],
        }
        
        # Publish task created event
        await self.event_bus.publish_event(
            event_type=EventType.TASK_CREATED,
            payload=task,
        )
    
    async def complete_step(
        self,
        step_id: str,
        result: Dict[str, Any],
        status: StepStatus = StepStatus.COMPLETED,
        error: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Complete a workflow step.
        
        Args:
            step_id: ID of the step to complete
            result: Result data from the step execution
            status: Final status for the step (default: COMPLETED)
            error: Optional error message if the step failed
            
        Returns:
            The updated step document
        """
        # Get the step
        try:
            step = self.steps_container.read_item(item=step_id, partition_key=step_id)
        except Exception as e:
            raise Exception(f"Failed to get step {step_id}: {str(e)}")
        
        # Update step status and result
        timestamp = datetime.utcnow().isoformat()
        step["status"] = status.value
        step["completed_at"] = timestamp
        step["updated_at"] = timestamp
        step["result"] = result
        
        if error:
            step["error"] = error
        
        # Update the step in Cosmos DB
        try:
            updated_step = self.steps_container.replace_item(item=step_id, body=step)
            
            # Publish step completed event
            await self.event_bus.publish_event(
                event_type=EventType.WORKFLOW_STEP_COMPLETED,
                payload={
                    "step_id": step_id,
                    "workflow_id": step["workflow_id"],
                    "status": status.value,
                    "has_error": error is not None,
                },
            )
            
            # Check if workflow is complete or schedule next steps
            await self._check_workflow_completion(step["workflow_id"])
            
            return updated_step
        
        except Exception as e:
            raise Exception(f"Failed to complete step: {str(e)}")
    
    async def _check_workflow_completion(self, workflow_id: str) -> None:
        """Check if a workflow is complete and update its status.
        
        Args:
            workflow_id: ID of the workflow to check
        """
        # Get all steps for the workflow
        try:
            steps = list(self.steps_container.query_items(
                query="SELECT * FROM c WHERE c.workflow_id = @workflow_id",
                parameters=[{"name": "@workflow_id", "value": workflow_id}],
                enable_cross_partition_query=True,
            ))
        except Exception as e:
            raise Exception(f"Failed to get steps for workflow {workflow_id}: {str(e)}")
        
        # Check if all steps are either COMPLETED, FAILED, or SKIPPED
        all_complete = True
        any_failed = False
        
        for step in steps:
            if step["status"] not in [
                StepStatus.COMPLETED.value,
                StepStatus.FAILED.value,
                StepStatus.SKIPPED.value,
            ]:
                all_complete = False
                break
            
            if step["status"] == StepStatus.FAILED.value:
                any_failed = True
        
        if all_complete:
            # Get the workflow
            try:
                workflow = self.workflows_container.read_item(
                    item=workflow_id,
                    partition_key=workflow_id,
                )
            except Exception as e:
                raise Exception(f"Failed to get workflow {workflow_id}: {str(e)}")
            
            # Collect results from all completed steps
            results = {}
            errors = {}
            
            for step in steps:
                if step["status"] == StepStatus.COMPLETED.value and step.get("result"):
                    results[step["id"]] = step["result"]
                
                if step["status"] == StepStatus.FAILED.value and step.get("error"):
                    errors[step["id"]] = step["error"]
            
            # Update workflow status
            timestamp = datetime.utcnow().isoformat()
            workflow["completed_at"] = timestamp
            workflow["updated_at"] = timestamp
            workflow["output_data"] = results
            
            if any_failed:
                workflow["status"] = WorkflowStatus.FAILED.value
                workflow["error"] = errors
                event_type = EventType.WORKFLOW_FAILED
            else:
                workflow["status"] = WorkflowStatus.COMPLETED.value
                event_type = EventType.WORKFLOW_COMPLETED
            
            # Update the workflow in Cosmos DB
            try:
                self.workflows_container.replace_item(item=workflow_id, body=workflow)
                
                # Publish workflow completed/failed event
                await self.event_bus.publish_event(
                    event_type=event_type,
                    payload={
                        "workflow_id": workflow_id,
                        "workflow_type": workflow["type"],
                        "tenant_id": workflow["tenant_id"],
                        "has_errors": any_failed,
                    },
                )
            
            except Exception as e:
                raise Exception(f"Failed to update workflow status: {str(e)}")
        
        else:
            # Schedule any steps that are now ready
            await self._schedule_ready_steps(workflow_id)
    
    async def get_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Get a workflow by ID.
        
        Args:
            workflow_id: ID of the workflow to get
            
        Returns:
            The workflow document
        """
        try:
            return self.workflows_container.read_item(item=workflow_id, partition_key=workflow_id)
        except Exception as e:
            raise Exception(f"Failed to get workflow {workflow_id}: {str(e)}")
    
    async def get_workflow_steps(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Get all steps for a workflow.
        
        Args:
            workflow_id: ID of the workflow to get steps for
            
        Returns:
            List of step documents
        """
        try:
            return list(self.steps_container.query_items(
                query="SELECT * FROM c WHERE c.workflow_id = @workflow_id",
                parameters=[{"name": "@workflow_id", "value": workflow_id}],
                enable_cross_partition_query=True,
            ))
        except Exception as e:
            raise Exception(f"Failed to get steps for workflow {workflow_id}: {str(e)}")
    
    async def cancel_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """Cancel a workflow.
        
        Args:
            workflow_id: ID of the workflow to cancel
            
        Returns:
            The updated workflow document
        """
        # Get the workflow
        try:
            workflow = self.workflows_container.read_item(item=workflow_id, partition_key=workflow_id)
        except Exception as e:
            raise Exception(f"Failed to get workflow {workflow_id}: {str(e)}")
        
        if workflow["status"] in [
            WorkflowStatus.COMPLETED.value,
            WorkflowStatus.FAILED.value,
            WorkflowStatus.CANCELLED.value,
        ]:
            raise Exception(f"Workflow {workflow_id} is already in final state: {workflow['status']}")
        
        # Update workflow status
        timestamp = datetime.utcnow().isoformat()
        workflow["status"] = WorkflowStatus.CANCELLED.value
        workflow["completed_at"] = timestamp
        workflow["updated_at"] = timestamp
        
        # Update the workflow in Cosmos DB
        try:
            updated_workflow = self.workflows_container.replace_item(item=workflow_id, body=workflow)
            
            # Publish workflow cancelled event
            await self.event_bus.publish_event(
                event_type=EventType.WORKFLOW_FAILED,  # Reusing the failed event type for cancellation
                payload={
                    "workflow_id": workflow_id,
                    "workflow_type": workflow["type"],
                    "tenant_id": workflow["tenant_id"],
                    "cancelled": True,
                },
            )
            
            return updated_workflow
        
        except Exception as e:
            raise Exception(f"Failed to cancel workflow: {str(e)}")
    
    async def find_workflows(
        self,
        tenant_id: Optional[str] = None,
        workflow_type: Optional[str] = None,
        status: Optional[WorkflowStatus] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Find workflows based on criteria.
        
        Args:
            tenant_id: Optional tenant ID to filter by
            workflow_type: Optional workflow type to filter by
            status: Optional workflow status to filter by
            start_date: Optional start date (ISO format) to filter by
            end_date: Optional end date (ISO format) to filter by
            limit: Maximum number of workflows to return
            
        Returns:
            List of workflow documents matching the criteria
        """
        query_parts = ["SELECT * FROM c WHERE 1=1"]
        parameters = []
        
        # Add filters
        if tenant_id:
            query_parts.append("AND c.tenant_id = @tenant_id")
            parameters.append({"name": "@tenant_id", "value": tenant_id})
        
        if workflow_type:
            query_parts.append("AND c.type = @workflow_type")
            parameters.append({"name": "@workflow_type", "value": workflow_type})
        
        if status:
            query_parts.append("AND c.status = @status")
            parameters.append({"name": "@status", "value": status.value})
        
        if start_date:
            query_parts.append("AND c.created_at >= @start_date")
            parameters.append({"name": "@start_date", "value": start_date})
        
        if end_date:
            query_parts.append("AND c.created_at <= @end_date")
            parameters.append({"name": "@end_date", "value": end_date})
        
        # Add ordering
        query_parts.append("ORDER BY c.created_at DESC")
        
        query = " ".join(query_parts)
        
        try:
            return list(self.workflows_container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=limit,
                enable_cross_partition_query=True,
            ))
        except Exception as e:
            raise Exception(f"Failed to find workflows: {str(e)}")
    
    async def retry_step(self, step_id: str) -> Dict[str, Any]:
        """Retry a failed workflow step.
        
        Args:
            step_id: ID of the step to retry
            
        Returns:
            The updated step document
        """
        # Get the step
        try:
            step = self.steps_container.read_item(item=step_id, partition_key=step_id)
        except Exception as e:
            raise Exception(f"Failed to get step {step_id}: {str(e)}")
        
        if step["status"] != StepStatus.FAILED.value:
            raise Exception(f"Step {step_id} is not in FAILED status")
        
        # Check retry count
        max_retries = step["retry_config"]["max_retries"]
        if step["retry_count"] >= max_retries:
            raise Exception(f"Step {step_id} has reached maximum retry count ({max_retries})")
        
        # Update step for retry
        timestamp = datetime.utcnow().isoformat()
        step["status"] = StepStatus.SCHEDULED.value
        step["scheduled_at"] = timestamp
        step["updated_at"] = timestamp
        step["retry_count"] += 1
        step["error"] = None  # Clear previous error
        
        # Update the step in Cosmos DB
        try:
            updated_step = self.steps_container.replace_item(item=step_id, body=step)
            
            # Create a task for this step
            await self._create_step_task(updated_step)
            
            return updated_step
        
        except Exception as e:
            raise Exception(f"Failed to retry step: {str(e)}")
    
    async def skip_step(self, step_id: str) -> Dict[str, Any]:
        """Skip a pending or failed workflow step.
        
        Args:
            step_id: ID of the step to skip
            
        Returns:
            The updated step document
        """
        # Get the step
        try:
            step = self.steps_container.read_item(item=step_id, partition_key=step_id)
        except Exception as e:
            raise Exception(f"Failed to get step {step_id}: {str(e)}")
        
        if step["status"] not in [StepStatus.PENDING.value, StepStatus.FAILED.value]:
            raise Exception(f"Step {step_id} cannot be skipped in status: {step['status']}")
        
        # Update step status
        timestamp = datetime.utcnow().isoformat()
        step["status"] = StepStatus.SKIPPED.value
        step["completed_at"] = timestamp
        step["updated_at"] = timestamp
        
        # Update the step in Cosmos DB
        try:
            updated_step = self.steps_container.replace_item(item=step_id, body=step)
            
            # Publish step completed event with skipped status
            await self.event_bus.publish_event(
                event_type=EventType.WORKFLOW_STEP_COMPLETED,
                payload={
                    "step_id": step_id,
                    "workflow_id": step["workflow_id"],
                    "status": StepStatus.SKIPPED.value,
                    "skipped": True,
                },
            )
            
            # Check if workflow is complete or schedule next steps
            await self._check_workflow_completion(step["workflow_id"])
            
            return updated_step
        
        except Exception as e:
            raise Exception(f"Failed to skip step: {str(e)}") 