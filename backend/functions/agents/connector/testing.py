"""Connector testing framework for the Connector Management Agent.

This module provides functionality to test and validate connectors,
including connection testing, data validation, and performance benchmarking.
"""

import asyncio
import inspect
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple, Type, Union

import importlib.util
import os.path
import sys

from shared.models.connector import ConnectorStatus, ConnectorInterface


logger = logging.getLogger(__name__)


class ConnectorTestResult:
    """Container for connector test results."""
    
    def __init__(
        self,
        test_id: str,
        connector_id: str,
        test_type: str,
        success: bool,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[float] = None,
    ):
        """Initialize test result.
        
        Args:
            test_id: Unique ID for this test run
            connector_id: ID of the connector being tested
            test_type: Type of test (connection, read, write, etc.)
            success: Whether the test passed
            message: Summary message
            details: Detailed test results
            duration_ms: Test duration in milliseconds
        """
        self.test_id = test_id
        self.connector_id = connector_id
        self.test_type = test_type
        self.success = success
        self.message = message
        self.details = details or {}
        self.duration_ms = duration_ms
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert test result to dictionary.
        
        Returns:
            Dictionary representation of test result
        """
        return {
            "test_id": self.test_id,
            "connector_id": self.connector_id,
            "test_type": self.test_type,
            "success": self.success,
            "message": self.message,
            "details": self.details,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp,
        }


class ConnectorTester:
    """Framework for testing and validating connectors."""
    
    def __init__(
        self,
        connectors_dir: str = "backend/functions/connectors",
        test_credentials_provider: Optional[Any] = None,
    ):
        """Initialize the connector tester.
        
        Args:
            connectors_dir: Directory containing connector implementations
            test_credentials_provider: Service to provide test credentials
        """
        self.connectors_dir = connectors_dir
        self.test_credentials_provider = test_credentials_provider
        
        # Cache of loaded connector classes
        self.connector_classes = {}
    
    async def test_connector(
        self,
        connector_id: str,
        tenant_id: str,
        test_config: Dict[str, Any]
    ) -> List[ConnectorTestResult]:
        """Run a comprehensive test suite for a connector.
        
        Args:
            connector_id: ID of the connector to test
            tenant_id: Tenant ID for the test
            test_config: Configuration for the test
            
        Returns:
            List of test results
        """
        results = []
        
        # Get the connector class
        connector_class = await self._get_connector_class(connector_id)
        if not connector_class:
            return [
                ConnectorTestResult(
                    test_id=f"load_{datetime.utcnow().isoformat()}",
                    connector_id=connector_id,
                    test_type="load",
                    success=False,
                    message=f"Failed to load connector: {connector_id}",
                )
            ]
        
        test_instance_id = f"test_{connector_id}_{datetime.utcnow().isoformat()}"
        
        # Create a test instance
        connector = connector_class(tenant_id=tenant_id, instance_id=test_instance_id)
        
        # Run initialization test
        init_result = await self._test_initialization(connector, test_config)
        results.append(init_result)
        
        # If initialization failed, stop testing
        if not init_result.success:
            return results
        
        # Run authentication test
        auth_result = await self._test_authentication(connector, test_config)
        results.append(auth_result)
        
        # If authentication failed, stop testing
        if not auth_result.success:
            return results
        
        # Run connection test
        connection_result = await self._test_connection(connector)
        results.append(connection_result)
        
        # If connection failed, stop testing
        if not connection_result.success:
            return results
        
        # Run schema test
        schema_result = await self._test_schema(connector)
        results.append(schema_result)
        
        # Run read test if enabled
        if test_config.get("test_read", True):
            read_result = await self._test_read(connector, test_config)
            results.append(read_result)
        
        # Run write test if enabled and supported
        if test_config.get("test_write", False) and hasattr(connector, "_supports_writing") and connector._supports_writing():
            write_result = await self._test_write(connector, test_config)
            results.append(write_result)
        
        # Run performance benchmark if enabled
        if test_config.get("benchmark", False):
            benchmark_result = await self._benchmark_performance(connector, test_config)
            results.append(benchmark_result)
        
        return results
    
    async def _get_connector_class(self, connector_id: str) -> Optional[Type[ConnectorInterface]]:
        """Dynamically load a connector class.
        
        Args:
            connector_id: ID of the connector to load
            
        Returns:
            Connector class or None if not found
        """
        # Check cache first
        if connector_id in self.connector_classes:
            return self.connector_classes[connector_id]
        
        # Extract connector name from ID
        connector_name = connector_id.split("_")[-1] if "_" in connector_id else connector_id
        
        # Look for connector directory
        connector_path = os.path.join(self.connectors_dir, f"{connector_name}_connector")
        if not os.path.exists(connector_path):
            logger.error(f"Connector directory not found: {connector_path}")
            return None
        
        # Look for connector implementation file
        connector_file = os.path.join(connector_path, f"{connector_name}_connector.py")
        if not os.path.exists(connector_file):
            connector_file = os.path.join(connector_path, "connector.py")
            if not os.path.exists(connector_file):
                logger.error(f"Connector implementation file not found in {connector_path}")
                return None
        
        try:
            # Load module dynamically
            module_name = f"{connector_name}_connector"
            spec = importlib.util.spec_from_file_location(module_name, connector_file)
            if not spec or not spec.loader:
                logger.error(f"Failed to create spec for module: {module_name}")
                return None
                
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
            # Find connector class in module
            for name, obj in inspect.getmembers(module):
                if (inspect.isclass(obj) and 
                    issubclass(obj, ConnectorInterface) and 
                    obj.__module__ == module_name):
                    # Cache and return the class
                    self.connector_classes[connector_id] = obj
                    return obj
            
            logger.error(f"No connector class found in module: {module_name}")
            return None
            
        except Exception as e:
            logger.error(f"Error loading connector class: {str(e)}")
            return None
    
    async def _test_initialization(
        self, 
        connector: ConnectorInterface,
        test_config: Dict[str, Any]
    ) -> ConnectorTestResult:
        """Test connector initialization.
        
        Args:
            connector: Connector instance to test
            test_config: Test configuration
            
        Returns:
            Test result
        """
        test_id = f"init_{datetime.utcnow().isoformat()}"
        
        try:
            start_time = time.time()
            
            # Extract config from test_config
            config = test_config.get("config", {})
            
            # Initialize the connector
            success = connector.initialize(config)
            
            duration_ms = (time.time() - start_time) * 1000
            
            if success:
                return ConnectorTestResult(
                    test_id=test_id,
                    connector_id=connector.instance_id,
                    test_type="initialization",
                    success=True,
                    message="Successfully initialized connector",
                    duration_ms=duration_ms,
                )
            else:
                return ConnectorTestResult(
                    test_id=test_id,
                    connector_id=connector.instance_id,
                    test_type="initialization",
                    success=False,
                    message="Failed to initialize connector",
                    duration_ms=duration_ms,
                )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="initialization",
                success=False,
                message=f"Error during initialization: {str(e)}",
                details={"error": str(e)},
            )
    
    async def _test_authentication(
        self, 
        connector: ConnectorInterface,
        test_config: Dict[str, Any]
    ) -> ConnectorTestResult:
        """Test connector authentication.
        
        Args:
            connector: Connector instance to test
            test_config: Test configuration
            
        Returns:
            Test result
        """
        test_id = f"auth_{datetime.utcnow().isoformat()}"
        
        try:
            start_time = time.time()
            
            # Extract credentials from test_config
            credentials = test_config.get("credentials", {})
            
            # If no credentials in config, try to get from provider
            if not credentials and self.test_credentials_provider:
                credentials = await self.test_credentials_provider.get_credentials(
                    connector_type=connector.__class__.__name__,
                    tenant_id=connector.tenant_id
                )
            
            if not credentials:
                return ConnectorTestResult(
                    test_id=test_id,
                    connector_id=connector.instance_id,
                    test_type="authentication",
                    success=False,
                    message="No credentials provided for authentication test",
                )
            
            # Authenticate the connector
            success = connector.authenticate(credentials)
            
            duration_ms = (time.time() - start_time) * 1000
            
            if success:
                return ConnectorTestResult(
                    test_id=test_id,
                    connector_id=connector.instance_id,
                    test_type="authentication",
                    success=True,
                    message="Successfully authenticated connector",
                    duration_ms=duration_ms,
                )
            else:
                return ConnectorTestResult(
                    test_id=test_id,
                    connector_id=connector.instance_id,
                    test_type="authentication",
                    success=False,
                    message="Failed to authenticate connector",
                    duration_ms=duration_ms,
                )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="authentication",
                success=False,
                message=f"Error during authentication: {str(e)}",
                details={"error": str(e)},
            )
    
    async def _test_connection(self, connector: ConnectorInterface) -> ConnectorTestResult:
        """Test connector connection.
        
        Args:
            connector: Connector instance to test
            
        Returns:
            Test result
        """
        test_id = f"connection_{datetime.utcnow().isoformat()}"
        
        try:
            start_time = time.time()
            
            # Test the connection
            result = connector.test_connection()
            
            duration_ms = (time.time() - start_time) * 1000
            
            success = result.get("success", False)
            message = result.get("message", "")
            
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="connection",
                success=success,
                message=message,
                details=result,
                duration_ms=duration_ms,
            )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="connection",
                success=False,
                message=f"Error testing connection: {str(e)}",
                details={"error": str(e)},
            )
    
    async def _test_schema(self, connector: ConnectorInterface) -> ConnectorTestResult:
        """Test connector schema retrieval.
        
        Args:
            connector: Connector instance to test
            
        Returns:
            Test result
        """
        test_id = f"schema_{datetime.utcnow().isoformat()}"
        
        try:
            start_time = time.time()
            
            # Get the schema
            result = connector.get_schema()
            
            duration_ms = (time.time() - start_time) * 1000
            
            success = result.get("success", False)
            message = result.get("message", "")
            schema = result.get("schema", {})
            
            # Validate the schema
            schema_valid = len(schema) > 0
            
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="schema",
                success=success and schema_valid,
                message=message if success else "Schema validation failed: empty schema",
                details={
                    "schema": schema,
                    "entity_count": len(schema),
                    "schema_valid": schema_valid,
                },
                duration_ms=duration_ms,
            )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="schema",
                success=False,
                message=f"Error retrieving schema: {str(e)}",
                details={"error": str(e)},
            )
    
    async def _test_read(
        self, 
        connector: ConnectorInterface,
        test_config: Dict[str, Any]
    ) -> ConnectorTestResult:
        """Test connector data reading.
        
        Args:
            connector: Connector instance to test
            test_config: Test configuration
            
        Returns:
            Test result
        """
        test_id = f"read_{datetime.utcnow().isoformat()}"
        
        try:
            start_time = time.time()
            
            # Extract query from test_config
            query = test_config.get("read_query", {})
            
            if not query:
                # Get schema to find available entity types
                schema_result = connector.get_schema()
                if schema_result.get("success", False):
                    schema = schema_result.get("schema", {})
                    if schema:
                        # Use the first entity type for testing
                        entity_type = next(iter(schema.keys()))
                        query = {"entity_type": entity_type, "limit": 10}
                
                if not query:
                    return ConnectorTestResult(
                        test_id=test_id,
                        connector_id=connector.instance_id,
                        test_type="read",
                        success=False,
                        message="No query provided for read test and no entity types found in schema",
                    )
            
            # Read data
            data = connector.read_data(query)
            
            duration_ms = (time.time() - start_time) * 1000
            
            # Validate the data
            success = isinstance(data, list)
            data_count = len(data) if success else 0
            
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="read",
                success=success,
                message=f"Successfully read {data_count} records" if success else "Failed to read data",
                details={
                    "query": query,
                    "data_count": data_count,
                    "sample": data[:2] if data_count > 0 else None,
                },
                duration_ms=duration_ms,
            )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="read",
                success=False,
                message=f"Error reading data: {str(e)}",
                details={"error": str(e)},
            )
    
    async def _test_write(
        self, 
        connector: ConnectorInterface,
        test_config: Dict[str, Any]
    ) -> ConnectorTestResult:
        """Test connector data writing.
        
        Args:
            connector: Connector instance to test
            test_config: Test configuration
            
        Returns:
            Test result
        """
        test_id = f"write_{datetime.utcnow().isoformat()}"
        
        try:
            start_time = time.time()
            
            # Extract test data from test_config
            test_data = test_config.get("write_data", [])
            
            if not test_data:
                return ConnectorTestResult(
                    test_id=test_id,
                    connector_id=connector.instance_id,
                    test_type="write",
                    success=False,
                    message="No test data provided for write test",
                )
            
            # Write data
            result = connector.write_data(test_data)
            
            duration_ms = (time.time() - start_time) * 1000
            
            success = result.get("success", False)
            message = result.get("message", "")
            
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="write",
                success=success,
                message=message,
                details=result,
                duration_ms=duration_ms,
            )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="write",
                success=False,
                message=f"Error writing data: {str(e)}",
                details={"error": str(e)},
            )
    
    async def _benchmark_performance(
        self, 
        connector: ConnectorInterface,
        test_config: Dict[str, Any]
    ) -> ConnectorTestResult:
        """Benchmark connector performance.
        
        Args:
            connector: Connector instance to test
            test_config: Test configuration
            
        Returns:
            Test result
        """
        test_id = f"benchmark_{datetime.utcnow().isoformat()}"
        
        try:
            benchmark_config = test_config.get("benchmark_config", {})
            iterations = benchmark_config.get("iterations", 3)
            read_query = benchmark_config.get("read_query") or test_config.get("read_query", {})
            
            if not read_query:
                # Get schema to find available entity types
                schema_result = connector.get_schema()
                if schema_result.get("success", False):
                    schema = schema_result.get("schema", {})
                    if schema:
                        # Use the first entity type for testing
                        entity_type = next(iter(schema.keys()))
                        read_query = {"entity_type": entity_type, "limit": 10}
                
                if not read_query:
                    return ConnectorTestResult(
                        test_id=test_id,
                        connector_id=connector.instance_id,
                        test_type="benchmark",
                        success=False,
                        message="No query provided for benchmark test",
                    )
            
            # Collect metrics
            metrics = {}
            
            # Test connection performance
            connection_times = []
            for i in range(iterations):
                start_time = time.time()
                connector.test_connection()
                connection_times.append((time.time() - start_time) * 1000)
            
            metrics["connection"] = {
                "avg_ms": sum(connection_times) / len(connection_times),
                "min_ms": min(connection_times),
                "max_ms": max(connection_times),
                "iterations": iterations,
            }
            
            # Test read performance
            read_times = []
            record_counts = []
            for i in range(iterations):
                start_time = time.time()
                data = connector.read_data(read_query)
                read_time = (time.time() - start_time) * 1000
                read_times.append(read_time)
                record_counts.append(len(data) if isinstance(data, list) else 0)
            
            metrics["read"] = {
                "avg_ms": sum(read_times) / len(read_times),
                "min_ms": min(read_times),
                "max_ms": max(read_times),
                "avg_records": sum(record_counts) / len(record_counts),
                "iterations": iterations,
            }
            
            # Calculate overall score based on metrics
            # Simple scoring - lower times are better, scale from 0-100
            # This is a very simplistic score and would need refinement in a real implementation
            connection_score = max(0, 100 - (metrics["connection"]["avg_ms"] / 10))
            read_score = max(0, 100 - (metrics["read"]["avg_ms"] / (10 * metrics["read"]["avg_records"] if metrics["read"]["avg_records"] > 0 else 1)))
            
            # Weight connection at 30% and read at 70%
            overall_score = (connection_score * 0.3) + (read_score * 0.7)
            
            metrics["scores"] = {
                "connection": connection_score,
                "read": read_score,
                "overall": overall_score,
            }
            
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="benchmark",
                success=True,
                message=f"Performance benchmark completed, overall score: {overall_score:.1f}/100",
                details=metrics,
            )
                
        except Exception as e:
            return ConnectorTestResult(
                test_id=test_id,
                connector_id=connector.instance_id,
                test_type="benchmark",
                success=False,
                message=f"Error during performance benchmark: {str(e)}",
                details={"error": str(e)},
            )
    
    async def validate_connector_code(
        self,
        connector_code: str,
        connector_name: str
    ) -> Dict[str, Any]:
        """Validate connector implementation code.
        
        Args:
            connector_code: Python code of the connector
            connector_name: Name of the connector
            
        Returns:
            Validation results
        """
        try:
            # Create a temporary directory for the code
            import tempfile
            import shutil
            
            temp_dir = tempfile.mkdtemp()
            module_name = f"{connector_name}_validator"
            module_path = os.path.join(temp_dir, f"{module_name}.py")
            
            try:
                # Write the code to a temporary file
                with open(module_path, "w") as f:
                    f.write(connector_code)
                
                # Try to import the module
                spec = importlib.util.spec_from_file_location(module_name, module_path)
                if not spec or not spec.loader:
                    return {
                        "valid": False,
                        "message": "Failed to create spec for module",
                        "errors": ["Invalid module specification"],
                    }
                    
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
                
                # Find connector class in module
                connector_class = None
                for name, obj in inspect.getmembers(module):
                    if (inspect.isclass(obj) and 
                        issubclass(obj, ConnectorInterface) and 
                        obj.__module__ == module_name):
                        connector_class = obj
                        break
                
                if not connector_class:
                    return {
                        "valid": False,
                        "message": "No connector class found in code",
                        "errors": ["Connector class not found"],
                    }
                
                # Check required methods
                required_methods = [
                    "_initialize_connector_config",
                    "_initialize_auth",
                    "_test_connection",
                    "_get_schema",
                    "_read_data",
                ]
                
                missing_methods = []
                for method in required_methods:
                    if not hasattr(connector_class, method) or not callable(getattr(connector_class, method)):
                        missing_methods.append(method)
                
                if missing_methods:
                    return {
                        "valid": False,
                        "message": f"Missing required methods: {', '.join(missing_methods)}",
                        "errors": [f"Missing method: {method}" for method in missing_methods],
                    }
                
                # Check for basic instance creation
                try:
                    instance = connector_class(tenant_id="test_tenant", instance_id="test_instance")
                except Exception as e:
                    return {
                        "valid": False,
                        "message": f"Failed to create connector instance: {str(e)}",
                        "errors": [str(e)],
                    }
                
                return {
                    "valid": True,
                    "message": "Connector code validation passed",
                    "class_name": connector_class.__name__,
                }
                
            finally:
                # Clean up temporary directory
                shutil.rmtree(temp_dir)
                if module_name in sys.modules:
                    del sys.modules[module_name]
                    
        except Exception as e:
            return {
                "valid": False,
                "message": f"Error validating connector code: {str(e)}",
                "errors": [str(e)],
            } 