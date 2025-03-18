"""
Data source connector models and interfaces.
"""
import abc
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

from .base import BaseEntity


class ConnectorType(str, Enum):
    """Types of data source connectors."""
    
    MARKETING = "marketing"
    SOCIAL_MEDIA = "social_media"
    ANALYTICS = "analytics"
    CRM = "crm"
    DATABASE = "database"
    FILE_STORAGE = "file_storage"
    API = "api"
    CUSTOM = "custom"


class ConnectorStatus(str, Enum):
    """Status of a connector instance."""
    
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"
    CONFIGURING = "configuring"


class AuthType(str, Enum):
    """Types of authentication methods."""
    
    OAUTH2 = "oauth2"
    API_KEY = "api_key"
    BASIC = "basic"
    JWT = "jwt"
    CUSTOM = "custom"
    NONE = "none"


class OAuth2Config(BaseModel):
    """OAuth2 configuration for a connector."""
    
    auth_url: str
    token_url: str
    client_id: str
    client_secret: str
    redirect_uri: str
    scope: List[str] = Field(default_factory=list)
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class ApiKeyConfig(BaseModel):
    """API key configuration for a connector."""
    
    header_name: str = "Authorization"
    prefix: Optional[str] = None  # e.g., "Bearer", "Basic", etc.
    query_param: Optional[str] = None  # alternative to header
    in_url: bool = False


class BasicAuthConfig(BaseModel):
    """Basic authentication configuration for a connector."""
    
    username_field: str = "username"
    password_field: str = "password"


class AuthConfig(BaseModel):
    """Authentication configuration for a connector."""
    
    auth_type: AuthType
    oauth2_config: Optional[OAuth2Config] = None
    api_key_config: Optional[ApiKeyConfig] = None
    basic_auth_config: Optional[BasicAuthConfig] = None
    custom_config: Optional[Dict[str, Any]] = None


class DataSourceFeature(str, Enum):
    """Features supported by a data source connector."""
    
    READ = "read"
    WRITE = "write"
    INCREMENTAL_SYNC = "incremental_sync"
    FULL_SYNC = "full_sync"
    SCHEMA_DISCOVERY = "schema_discovery"
    SEARCH = "search"
    STREAMING = "streaming"


class DataField(BaseModel):
    """Field definition for a data source connector."""
    
    name: str
    display_name: str
    description: Optional[str] = None
    data_type: str
    required: bool = False
    searchable: bool = False
    filterable: bool = False
    sortable: bool = False
    default_value: Optional[Any] = None
    options: Optional[List[Any]] = None
    validation_regex: Optional[str] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class ConnectorDefinition(BaseEntity):
    """Definition of a data source connector type."""
    
    name: str
    display_name: str
    description: str
    connector_type: ConnectorType
    auth_config: AuthConfig
    icon_url: Optional[str] = None
    version: str = "1.0.0"
    features: List[DataSourceFeature] = Field(default_factory=list)
    fields: List[DataField] = Field(default_factory=list)
    default_configuration: Dict[str, Any] = Field(default_factory=dict)
    capabilities: Dict[str, Any] = Field(default_factory=dict)
    is_builtin: bool = False
    is_enabled: bool = True
    author: Optional[str] = None
    documentation_url: Optional[str] = None
    
    @property
    def connector_id(self) -> str:
        """Get a unique identifier for this connector type."""
        return f"{self.connector_type.value}_{self.name}"


class ConnectorInstance(BaseEntity):
    """Instance of a configured connector for a tenant."""
    
    connector_definition_id: str
    name: str
    status: ConnectorStatus = ConnectorStatus.INACTIVE
    auth_credentials: Dict[str, Any] = Field(default_factory=dict)
    configuration: Dict[str, Any] = Field(default_factory=dict)
    last_sync_time: Optional[datetime] = None
    next_sync_time: Optional[datetime] = None
    sync_interval_minutes: Optional[int] = None
    sync_status: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v is not None else None
        }


class SyncSchedule(BaseEntity):
    """Sync schedule for a connector instance."""
    
    connector_instance_id: str
    is_enabled: bool = True
    frequency: str  # cron expression
    last_execution: Optional[datetime] = None
    next_execution: Optional[datetime] = None
    sync_mode: str = "incremental"  # incremental or full
    parameters: Dict[str, Any] = Field(default_factory=dict)


class DataSourceEntity(BaseModel):
    """Data entity from a data source connector."""
    
    id: str
    tenant_id: str
    connector_instance_id: str
    entity_type: str
    raw_data: Dict[str, Any]
    processed_data: Dict[str, Any]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for database storage."""
        return self.model_dump(exclude_none=True)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DataSourceEntity":
        """Create model instance from dictionary."""
        return cls(**data)


class ConnectorInterface(abc.ABC):
    """Base interface for data source connectors."""
    
    @abc.abstractmethod
    def initialize(self, config: Dict[str, Any]) -> bool:
        """
        Initialize the connector with configuration.
        
        Args:
            config: Connector configuration
            
        Returns:
            True if initialization successful, False otherwise
        """
        pass
    
    @abc.abstractmethod
    def authenticate(self, credentials: Dict[str, Any]) -> bool:
        """
        Authenticate with the data source.
        
        Args:
            credentials: Authentication credentials
            
        Returns:
            True if authentication successful, False otherwise
        """
        pass
    
    @abc.abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to the data source.
        
        Returns:
            Dictionary with connection status and details
        """
        pass
    
    @abc.abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """
        Get the schema of the data source.
        
        Returns:
            Dictionary with schema information
        """
        pass
    
    @abc.abstractmethod
    def read_data(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Read data from the data source.
        
        Args:
            query: Query parameters
            
        Returns:
            List of data records
        """
        pass
    
    @abc.abstractmethod
    def write_data(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Write data to the data source.
        
        Args:
            data: Data to write
            
        Returns:
            Dictionary with write operation results
        """
        pass
    
    @abc.abstractmethod
    def sync_data(self, mode: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync data from the data source.
        
        Args:
            mode: Sync mode (incremental or full)
            params: Sync parameters
            
        Returns:
            Dictionary with sync operation results
        """
        pass 