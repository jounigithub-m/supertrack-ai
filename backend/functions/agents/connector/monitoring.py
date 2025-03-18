"""Connector monitoring module for the Connector Management Agent.

This module provides functionality to monitor the health of connectors,
track performance metrics, and detect potential issues.
"""

import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

import azure.cosmos.cosmos_client as cosmos_client
from azure.cosmos import CosmosClient, ContainerProxy, exceptions

from shared.models.connector import ConnectorStatus


logger = logging.getLogger(__name__)


class ConnectorMonitor:
    """Monitor connector health and performance."""
    
    def __init__(
        self,
        cosmos_client: Optional[CosmosClient] = None,
        cosmos_database_id: Optional[str] = None,
        logs_container_id: Optional[str] = None,
        metrics_container_id: Optional[str] = None,
        health_threshold_minutes: int = 60,
    ):
        """Initialize the connector monitor.
        
        Args:
            cosmos_client: Cosmos DB client for accessing logs and metrics
            cosmos_database_id: Cosmos DB database ID
            logs_container_id: Container ID for connector logs
            metrics_container_id: Container ID for connector metrics
            health_threshold_minutes: Time threshold in minutes for health checks
        """
        self.cosmos_client = cosmos_client
        self.cosmos_database_id = cosmos_database_id
        self.logs_container_id = logs_container_id
        self.metrics_container_id = metrics_container_id
        self.health_threshold_minutes = health_threshold_minutes
        
        self.logs_container = self._get_container(logs_container_id)
        self.metrics_container = self._get_container(metrics_container_id)
        
        # Cache for connector metrics to reduce database queries
        self.metrics_cache = {}
        self.cache_expiry = {}
        self.cache_ttl_seconds = 300  # 5 minutes
    
    def _get_container(self, container_id: Optional[str]) -> Optional[ContainerProxy]:
        """Get a Cosmos DB container.
        
        Args:
            container_id: Container ID
            
        Returns:
            ContainerProxy object or None if not available
        """
        if not self.cosmos_client or not self.cosmos_database_id or not container_id:
            return None
        
        try:
            database = self.cosmos_client.get_database_client(self.cosmos_database_id)
            return database.get_container_client(container_id)
        except Exception as e:
            logger.error(f"Failed to get Cosmos container {container_id}: {str(e)}")
            return None
    
    async def check_connector_health(
        self, 
        tenant_id: str, 
        connector_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check the health status of one or all connectors for a tenant.
        
        Args:
            tenant_id: Tenant ID
            connector_id: Optional specific connector ID to check
            
        Returns:
            Dictionary with health status information
        """
        if not self.logs_container:
            return {
                "success": False,
                "message": "Logs container not available for health checks",
                "health_status": {},
            }
        
        try:
            # Define the time threshold for health check
            threshold_time = datetime.utcnow() - timedelta(minutes=self.health_threshold_minutes)
            threshold_str = threshold_time.isoformat()
            
            # Query parameters
            params = [
                {"name": "@tenant_id", "value": tenant_id},
                {"name": "@threshold_time", "value": threshold_str}
            ]
            
            # Build the query based on whether we're checking one or all connectors
            query = """
                SELECT c.connector_id, c.status, c.last_active, c.last_success, c.last_error
                FROM c 
                WHERE c.tenant_id = @tenant_id 
                AND c.type = 'connector_status'
                AND c.last_update > @threshold_time
            """
            
            if connector_id:
                query += " AND c.connector_id = @connector_id"
                params.append({"name": "@connector_id", "value": connector_id})
            
            # Execute the query
            health_results = list(self.logs_container.query_items(
                query=query,
                parameters=params,
                enable_cross_partition_query=True
            ))
            
            # Process health status
            health_status = {}
            for result in health_results:
                connector_id = result.get("connector_id")
                status = result.get("status", ConnectorStatus.UNKNOWN.value)
                last_active = result.get("last_active")
                last_success = result.get("last_success")
                last_error = result.get("last_error")
                
                # Calculate health score based on status and time since last activity
                health_score = self._calculate_health_score(status, last_active, last_success, last_error)
                
                health_status[connector_id] = {
                    "status": status,
                    "health_score": health_score,
                    "last_active": last_active,
                    "last_success": last_success,
                    "last_error_message": last_error.get("message") if last_error else None,
                    "last_error_time": last_error.get("time") if last_error else None,
                }
            
            return {
                "success": True,
                "message": f"Retrieved health status for {len(health_status)} connectors",
                "health_status": health_status,
            }
            
        except Exception as e:
            logger.error(f"Error checking connector health: {str(e)}")
            return {
                "success": False,
                "message": f"Error checking connector health: {str(e)}",
                "health_status": {},
            }
    
    def _calculate_health_score(
        self,
        status: str,
        last_active: Optional[str],
        last_success: Optional[str],
        last_error: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate a health score from 0.0 (unhealthy) to 1.0 (healthy).
        
        Args:
            status: Current connector status
            last_active: ISO timestamp of last activity
            last_success: ISO timestamp of last successful operation
            last_error: Error details from last error
            
        Returns:
            Health score between 0.0 and 1.0
        """
        # Base score based on status
        base_score = 0.5  # neutral starting point
        
        if status == ConnectorStatus.ACTIVE.value:
            base_score = 0.8
        elif status == ConnectorStatus.INACTIVE.value:
            base_score = 0.3
        elif status == ConnectorStatus.ERROR.value:
            base_score = 0.2
        elif status == ConnectorStatus.DISABLED.value:
            base_score = 0.0
        
        # Adjust score based on last activity
        if last_active:
            try:
                last_active_time = datetime.fromisoformat(last_active)
                time_diff = datetime.utcnow() - last_active_time
                hours_since_active = time_diff.total_seconds() / 3600
                
                # Reduce score as time since last activity increases
                if hours_since_active > 24:
                    base_score -= 0.3
                elif hours_since_active > 12:
                    base_score -= 0.2
                elif hours_since_active > 6:
                    base_score -= 0.1
            except ValueError:
                # Invalid timestamp format
                pass
        
        # Adjust score based on recent successful operation
        if last_success:
            try:
                last_success_time = datetime.fromisoformat(last_success)
                time_diff = datetime.utcnow() - last_success_time
                hours_since_success = time_diff.total_seconds() / 3600
                
                # Increase score if recent success
                if hours_since_success < 1:
                    base_score += 0.2
                elif hours_since_success < 6:
                    base_score += 0.1
            except ValueError:
                # Invalid timestamp format
                pass
        
        # Adjust score based on recent errors
        if last_error:
            try:
                error_time = last_error.get("time")
                if error_time:
                    error_time_dt = datetime.fromisoformat(error_time)
                    time_diff = datetime.utcnow() - error_time_dt
                    hours_since_error = time_diff.total_seconds() / 3600
                    
                    # Decrease score if recent error
                    if hours_since_error < 1:
                        base_score -= 0.3
                    elif hours_since_error < 3:
                        base_score -= 0.2
                    elif hours_since_error < 12:
                        base_score -= 0.1
            except ValueError:
                # Invalid timestamp format
                pass
        
        # Ensure score is between 0.0 and 1.0
        return max(0.0, min(1.0, base_score))
    
    async def get_connector_metrics(
        self,
        tenant_id: str,
        connector_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get performance metrics for a connector.
        
        Args:
            tenant_id: Tenant ID
            connector_id: Connector ID
            start_time: Start time for metrics (ISO format)
            end_time: End time for metrics (ISO format)
            metrics: List of metric names to retrieve (None for all)
            
        Returns:
            Dictionary with metrics data
        """
        if not self.metrics_container:
            return {
                "success": False,
                "message": "Metrics container not available",
                "metrics": {},
            }
        
        cache_key = f"{tenant_id}:{connector_id}:{start_time}:{end_time}:{','.join(metrics) if metrics else 'all'}"
        
        # Check cache
        if cache_key in self.metrics_cache and time.time() < self.cache_expiry.get(cache_key, 0):
            return {
                "success": True,
                "message": "Retrieved metrics from cache",
                "metrics": self.metrics_cache[cache_key],
            }
        
        try:
            # Set default time range if not provided
            if not start_time:
                start_time = (datetime.utcnow() - timedelta(days=7)).isoformat()
            if not end_time:
                end_time = datetime.utcnow().isoformat()
            
            # Query parameters
            params = [
                {"name": "@tenant_id", "value": tenant_id},
                {"name": "@connector_id", "value": connector_id},
                {"name": "@start_time", "value": start_time},
                {"name": "@end_time", "value": end_time}
            ]
            
            # Build the query
            query = """
                SELECT c.timestamp, c.metric_name, c.metric_value, c.metric_unit
                FROM c 
                WHERE c.tenant_id = @tenant_id 
                AND c.connector_id = @connector_id
                AND c.type = 'connector_metric'
                AND c.timestamp >= @start_time
                AND c.timestamp <= @end_time
            """
            
            if metrics:
                metrics_list = ", ".join([f"'{m}'" for m in metrics])
                query += f" AND c.metric_name IN ({metrics_list})"
            
            # Execute the query
            metrics_results = list(self.metrics_container.query_items(
                query=query,
                parameters=params,
                enable_cross_partition_query=True
            ))
            
            # Process metrics
            metrics_data = {}
            for result in metrics_results:
                metric_name = result.get("metric_name")
                timestamp = result.get("timestamp")
                value = result.get("metric_value")
                unit = result.get("metric_unit", "")
                
                if metric_name not in metrics_data:
                    metrics_data[metric_name] = {
                        "values": [],
                        "unit": unit
                    }
                
                metrics_data[metric_name]["values"].append({
                    "timestamp": timestamp,
                    "value": value
                })
            
            # Sort metrics by timestamp
            for metric_name, data in metrics_data.items():
                data["values"] = sorted(data["values"], key=lambda x: x["timestamp"])
            
            # Cache the result
            self.metrics_cache[cache_key] = metrics_data
            self.cache_expiry[cache_key] = time.time() + self.cache_ttl_seconds
            
            return {
                "success": True,
                "message": f"Retrieved {len(metrics_data)} metrics",
                "metrics": metrics_data,
            }
            
        except Exception as e:
            logger.error(f"Error retrieving connector metrics: {str(e)}")
            return {
                "success": False,
                "message": f"Error retrieving connector metrics: {str(e)}",
                "metrics": {},
            }
    
    async def detect_api_changes(
        self,
        tenant_id: str,
        connector_id: str,
        days_to_analyze: int = 7
    ) -> Dict[str, Any]:
        """Detect potential API changes based on error patterns.
        
        Args:
            tenant_id: Tenant ID
            connector_id: Connector ID
            days_to_analyze: Number of days of logs to analyze
            
        Returns:
            Dictionary with detected changes and confidence scores
        """
        if not self.logs_container:
            return {
                "success": False,
                "message": "Logs container not available for change detection",
                "changes_detected": False,
                "api_changes": [],
            }
        
        try:
            # Define the time range
            start_time = (datetime.utcnow() - timedelta(days=days_to_analyze)).isoformat()
            end_time = datetime.utcnow().isoformat()
            
            # Query parameters
            params = [
                {"name": "@tenant_id", "value": tenant_id},
                {"name": "@connector_id", "value": connector_id},
                {"name": "@start_time", "value": start_time},
                {"name": "@end_time", "value": end_time}
            ]
            
            # Query to get error logs
            query = """
                SELECT c.timestamp, c.error_type, c.message, c.status_code, c.endpoint, c.request_data
                FROM c 
                WHERE c.tenant_id = @tenant_id 
                AND c.connector_id = @connector_id
                AND c.type = 'connector_error'
                AND c.timestamp >= @start_time
                AND c.timestamp <= @end_time
                ORDER BY c.timestamp DESC
            """
            
            # Execute the query
            error_logs = list(self.logs_container.query_items(
                query=query,
                parameters=params,
                enable_cross_partition_query=True
            ))
            
            if not error_logs:
                return {
                    "success": True,
                    "message": "No errors found in the specified time period",
                    "changes_detected": False,
                    "api_changes": [],
                }
            
            # Analyze error patterns
            api_changes = self._analyze_error_patterns(error_logs)
            
            return {
                "success": True,
                "message": f"Analyzed {len(error_logs)} errors, detected {len(api_changes)} potential API changes",
                "changes_detected": len(api_changes) > 0,
                "api_changes": api_changes,
            }
            
        except Exception as e:
            logger.error(f"Error detecting API changes: {str(e)}")
            return {
                "success": False,
                "message": f"Error detecting API changes: {str(e)}",
                "changes_detected": False,
                "api_changes": [],
            }
    
    def _analyze_error_patterns(self, error_logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze error logs to detect potential API changes.
        
        Args:
            error_logs: List of error log entries
            
        Returns:
            List of detected API changes with confidence scores
        """
        # Group errors by endpoint
        endpoint_errors = {}
        for error in error_logs:
            endpoint = error.get("endpoint", "unknown")
            if endpoint not in endpoint_errors:
                endpoint_errors[endpoint] = []
            endpoint_errors[endpoint].append(error)
        
        api_changes = []
        
        # Analyze each endpoint
        for endpoint, errors in endpoint_errors.items():
            # Look for patterns indicative of API changes
            
            # Check for sudden increase in 400/404 errors
            recent_errors = [e for e in errors if e.get("status_code") in (400, 404)]
            if len(recent_errors) >= 3:  # Arbitrary threshold
                # Check if these errors started recently
                timestamps = [datetime.fromisoformat(e.get("timestamp")) for e in recent_errors]
                if timestamps and max(timestamps) - min(timestamps) < timedelta(days=2):
                    api_changes.append({
                        "endpoint": endpoint,
                        "change_type": "endpoint_not_found" if recent_errors[0].get("status_code") == 404 else "invalid_request",
                        "confidence": 0.8,
                        "first_seen": min(timestamps).isoformat(),
                        "error_count": len(recent_errors),
                        "sample_error": recent_errors[0].get("message", ""),
                    })
            
            # Check for schema changes (400 errors with field validation messages)
            schema_errors = [e for e in errors if (
                e.get("status_code") == 400 and 
                any(field in (e.get("message") or "") for field in ["field", "parameter", "property", "required"])
            )]
            if len(schema_errors) >= 2:  # Arbitrary threshold
                # Extract likely field names from error messages
                field_names = set()
                for error in schema_errors:
                    message = error.get("message", "")
                    # Very basic extraction - would need more sophisticated parsing in real implementation
                    for word in message.split():
                        if word.startswith("'") and word.endswith("'"):
                            field_names.add(word.strip("'"))
                
                if field_names:
                    api_changes.append({
                        "endpoint": endpoint,
                        "change_type": "schema_change",
                        "confidence": 0.7,
                        "first_seen": min([datetime.fromisoformat(e.get("timestamp")) for e in schema_errors]).isoformat(),
                        "error_count": len(schema_errors),
                        "affected_fields": list(field_names),
                        "sample_error": schema_errors[0].get("message", ""),
                    })
            
            # Check for authentication changes
            auth_errors = [e for e in errors if (
                e.get("status_code") in (401, 403) or
                any(term in (e.get("message") or "").lower() for term in ["auth", "token", "permission", "access"])
            )]
            if len(auth_errors) >= 2:  # Arbitrary threshold
                api_changes.append({
                    "endpoint": endpoint,
                    "change_type": "authentication_change",
                    "confidence": 0.75,
                    "first_seen": min([datetime.fromisoformat(e.get("timestamp")) for e in auth_errors]).isoformat(),
                    "error_count": len(auth_errors),
                    "sample_error": auth_errors[0].get("message", ""),
                })
        
        return api_changes
    
    async def record_connector_metric(
        self,
        tenant_id: str,
        connector_id: str,
        metric_name: str,
        metric_value: Any,
        metric_unit: str = "",
        timestamp: Optional[str] = None
    ) -> bool:
        """Record a connector metric value.
        
        Args:
            tenant_id: Tenant ID
            connector_id: Connector ID
            metric_name: Name of the metric
            metric_value: Value of the metric
            metric_unit: Unit of measurement
            timestamp: Timestamp in ISO format (default: current time)
            
        Returns:
            True if recording was successful, False otherwise
        """
        if not self.metrics_container:
            logger.warning(f"Cannot record metric {metric_name}: metrics container not available")
            return False
        
        try:
            if not timestamp:
                timestamp = datetime.utcnow().isoformat()
            
            metric_id = f"{tenant_id}:{connector_id}:{metric_name}:{timestamp}"
            
            metric_record = {
                "id": metric_id,
                "tenant_id": tenant_id,
                "connector_id": connector_id,
                "type": "connector_metric",
                "metric_name": metric_name,
                "metric_value": metric_value,
                "metric_unit": metric_unit,
                "timestamp": timestamp,
            }
            
            self.metrics_container.create_item(body=metric_record)
            
            # Invalidate cache
            cache_keys_to_invalidate = []
            for key in self.metrics_cache:
                if f"{tenant_id}:{connector_id}:" in key:
                    cache_keys_to_invalidate.append(key)
            
            for key in cache_keys_to_invalidate:
                if key in self.metrics_cache:
                    del self.metrics_cache[key]
                if key in self.cache_expiry:
                    del self.cache_expiry[key]
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording connector metric: {str(e)}")
            return False
    
    async def record_connector_error(
        self,
        tenant_id: str,
        connector_id: str,
        error_type: str,
        message: str,
        status_code: Optional[int] = None,
        endpoint: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Record a connector error.
        
        Args:
            tenant_id: Tenant ID
            connector_id: Connector ID
            error_type: Type of error
            message: Error message
            status_code: HTTP status code if applicable
            endpoint: API endpoint that generated the error
            request_data: Request data that generated the error
            
        Returns:
            True if recording was successful, False otherwise
        """
        if not self.logs_container:
            logger.warning(f"Cannot record error {error_type}: logs container not available")
            return False
        
        try:
            timestamp = datetime.utcnow().isoformat()
            error_id = f"{tenant_id}:{connector_id}:{error_type}:{timestamp}"
            
            error_record = {
                "id": error_id,
                "tenant_id": tenant_id,
                "connector_id": connector_id,
                "type": "connector_error",
                "error_type": error_type,
                "message": message,
                "status_code": status_code,
                "endpoint": endpoint,
                "request_data": request_data,
                "timestamp": timestamp,
            }
            
            self.logs_container.create_item(body=error_record)
            
            # Update connector status
            await self._update_connector_status(
                tenant_id=tenant_id,
                connector_id=connector_id,
                status=ConnectorStatus.ERROR.value,
                last_error={
                    "type": error_type,
                    "message": message,
                    "time": timestamp,
                }
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording connector error: {str(e)}")
            return False
    
    async def _update_connector_status(
        self,
        tenant_id: str,
        connector_id: str,
        status: str,
        last_error: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update the status of a connector.
        
        Args:
            tenant_id: Tenant ID
            connector_id: Connector ID
            status: New status
            last_error: Error details if status is ERROR
            
        Returns:
            True if update was successful, False otherwise
        """
        if not self.logs_container:
            logger.warning(f"Cannot update connector status: logs container not available")
            return False
        
        try:
            timestamp = datetime.utcnow().isoformat()
            status_id = f"{tenant_id}:{connector_id}:status"
            
            # Get current status document if it exists
            try:
                current_status = self.logs_container.read_item(
                    item=status_id,
                    partition_key=tenant_id
                )
                # Update existing document
                current_status["status"] = status
                current_status["last_update"] = timestamp
                current_status["last_active"] = timestamp
                
                if status == ConnectorStatus.ACTIVE.value:
                    current_status["last_success"] = timestamp
                
                if last_error:
                    current_status["last_error"] = last_error
                
                self.logs_container.replace_item(
                    item=status_id,
                    body=current_status
                )
                
            except exceptions.CosmosResourceNotFoundError:
                # Create new status document
                status_record = {
                    "id": status_id,
                    "tenant_id": tenant_id,
                    "connector_id": connector_id,
                    "type": "connector_status",
                    "status": status,
                    "created_at": timestamp,
                    "last_update": timestamp,
                    "last_active": timestamp,
                    "last_success": timestamp if status == ConnectorStatus.ACTIVE.value else None,
                    "last_error": last_error,
                }
                
                self.logs_container.create_item(body=status_record)
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating connector status: {str(e)}")
            return False 