"""
Template for REST API based connectors.

This template contains the structure for a new REST API connector with
placeholders that will be filled by the Connector Management Agent when
generating a specific connector implementation.

Template variables:
- {{connector_name}}: The name of the connector (snake_case)
- {{connector_class_name}}: The class name of the connector (PascalCase)
- {{api_name}}: The name of the API (Human readable)
- {{api_base_url}}: The base URL for the API
- {{auth_type}}: The authentication type (oauth2, api_key, basic_auth, custom)
- {{oauth_config}}: OAuth2 configuration if applicable
- {{rate_limit}}: Rate limiting information
- {{entity_types}}: List of entity types this connector can fetch
- {{date_created}}: Date when this connector was created
- {{author}}: Author of this connector (usually "Connector Management Agent")
"""

import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import requests
from requests.auth import AuthBase

from backend.functions.connectors.base_connector import BaseConnector
from shared.models.connector import (
    AuthConfig,
    AuthType,
    ConnectorStatus,
    DataSourceEntity
)
from utils.logger import configure_logger


logger = configure_logger(__name__)


class {{connector_class_name}}(BaseConnector):
    """
    {{api_name}} connector implementation.
    
    This connector interfaces with the {{api_name}} API to extract data
    for integration with the Supertrack AI Platform.
    
    Created: {{date_created}}
    Author: {{author}}
    """
    
    def __init__(self, tenant_id: str, instance_id: str):
        """
        Initialize the {{api_name}} connector.
        
        Args:
            tenant_id: Tenant ID
            instance_id: Connector instance ID
        """
        super().__init__(tenant_id, instance_id)
        self.base_url = "{{api_base_url}}"
        self.rate_limit_delay = {{rate_limit}}  # Seconds between API calls
    
    def _initialize_connector_config(self, config: Dict[str, Any]) -> bool:
        """
        Initialize connector configuration.
        
        Args:
            config: Connector configuration parameters
            
        Returns:
            True if initialization is successful, False otherwise
        """
        try:
            # Required configuration parameters
            required_params = ["entity_types"]
            for param in required_params:
                if param not in config:
                    logger.error(f"Missing required configuration parameter: {param}")
                    return False
            
            self.entity_types = config.get("entity_types", [])
            
            # Optional configuration parameters
            self.page_size = config.get("page_size", 100)
            self.max_retries = config.get("max_retries", 3)
            self.timeout = config.get("timeout", 30)
            
            # Custom configuration parameters for this connector
            # TODO: Add custom configuration here
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing connector config: {str(e)}")
            return False
    
    def _initialize_auth(self, credentials: Dict[str, Any]) -> bool:
        """
        Initialize authentication based on the authentication type.
        
        Args:
            credentials: Authentication credentials
            
        Returns:
            True if authentication initialization is successful, False otherwise
        """
        try:
            auth_type = credentials.get("auth_type", "{{auth_type}}")
            
            # Configure auth based on type
            if auth_type == AuthType.OAUTH2.value:
                return self._setup_oauth2(credentials)
            elif auth_type == AuthType.API_KEY.value:
                return self._setup_api_key(credentials)
            elif auth_type == AuthType.BASIC_AUTH.value:
                return self._setup_basic_auth(credentials)
            elif auth_type == AuthType.CUSTOM.value:
                return self._setup_custom_auth(credentials)
            else:
                logger.error(f"Unsupported authentication type: {auth_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing authentication: {str(e)}")
            return False
    
    def _test_connection(self) -> Dict[str, Any]:
        """
        Test the connection to the API.
        
        Returns:
            Dictionary with connection test results
        """
        try:
            # Typically test using a lightweight API endpoint
            response = self._make_request("GET", "{{test_endpoint}}")
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "message": "Successfully connected to the API",
                    "data": response.json() if hasattr(response, "json") else {}
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "message": f"Failed to connect to API: {response.text}",
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Error testing connection: {str(e)}",
            }
    
    def _get_schema(self) -> Dict[str, Any]:
        """
        Get the schema for available entity types.
        
        Returns:
            Dictionary containing entity schemas
        """
        schema = {}
        
        try:
            # For each supported entity type, define its schema
            for entity_type in self.entity_types:
                # TODO: Replace with actual schema for each entity type
                schema[entity_type] = {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        # Add more properties based on the entity type
                    }
                }
            
            return {
                "success": True,
                "schema": schema,
                "message": f"Retrieved schema for {len(schema)} entity types"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error retrieving schema: {str(e)}",
                "schema": {}
            }
    
    def _read_data(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Read data from the API based on the query parameters.
        
        Args:
            query: Query parameters including entity_type, filters, etc.
            
        Returns:
            List of data objects retrieved from the API
        """
        entity_type = query.get("entity_type")
        if not entity_type or entity_type not in self.entity_types:
            logger.error(f"Invalid entity type: {entity_type}")
            return []
        
        # Common query parameters
        filters = query.get("filters", {})
        limit = query.get("limit", self.page_size)
        start_date = query.get("start_date")
        end_date = query.get("end_date")
        
        try:
            # Endpoint for the entity type
            endpoint = f"{{{{entity_endpoint_base}}}}/{entity_type}"
            
            # Build query parameters
            params = {
                "limit": limit,
                # Add other common parameters
            }
            
            # Add date filters if provided
            if start_date:
                params["start_date"] = start_date
            if end_date:
                params["end_date"] = end_date
                
            # Add custom filters
            for key, value in filters.items():
                params[key] = value
            
            all_data = []
            page = 1
            has_more = True
            
            # Handle pagination
            while has_more:
                params["page"] = page
                
                response = self._make_request("GET", endpoint, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Error fetching data: {response.status_code} - {response.text}")
                    break
                
                data = response.json()
                
                # Extract the results - adjust based on API response structure
                results = data.get("results", [])
                if not results:
                    results = data.get("data", [])
                if not results and isinstance(data, list):
                    results = data
                
                all_data.extend(results)
                
                # Check if there are more pages - adjust based on API pagination structure
                has_more = data.get("has_more", False)
                if not has_more and data.get("next_page"):
                    has_more = True
                    
                # Safety check to prevent infinite loops
                if not results or len(all_data) >= limit:
                    has_more = False
                    
                page += 1
            
            # Process data if needed
            processed_data = [self._process_entity(entity_type, item) for item in all_data]
            
            return processed_data
            
        except Exception as e:
            logger.error(f"Error reading data: {str(e)}")
            return []
    
    def _process_entity(self, entity_type: str, raw_entity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a raw entity from the API into a standardized format.
        
        Args:
            entity_type: Type of the entity
            raw_entity: Raw entity data from the API
            
        Returns:
            Processed entity data
        """
        # Create a copy to avoid modifying the original
        processed = raw_entity.copy()
        
        # Add standard fields for all entities
        if "id" not in processed:
            processed["id"] = raw_entity.get("{{id_field}}", str(hash(json.dumps(raw_entity))))
            
        # Add metadata
        processed["_metadata"] = {
            "source": "{{api_name}}",
            "entity_type": entity_type,
            "extracted_at": datetime.utcnow().isoformat(),
            "connector_id": self.instance_id
        }
        
        # Entity-specific processing
        if entity_type == "users":
            # Example: format user data
            if "name" in raw_entity:
                name_parts = raw_entity["name"].split(" ", 1)
                processed["first_name"] = name_parts[0]
                processed["last_name"] = name_parts[1] if len(name_parts) > 1 else ""
                
        # TODO: Add processing for other entity types
        
        return processed 