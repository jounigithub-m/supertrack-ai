"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Database,
  PlusIcon,
  RefreshCcw,
  Link2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  ChevronsUpDown,
  FileText,
  Globe,
  Search,
  Plus,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DashboardLayout } from "@/components/dashboard-layout"
import { GoogleAnalyticsConnector } from "./google-analytics-connector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

interface DataSource {
  id: string
  name: string
  type: string
  recordCount: number
  status: "connected" | "error" | "syncing"
  lastSync: {
    timestamp: string
    duration: string
  }
  error?: string
}

// Group data sources by type
interface DataSourceGroup {
  type: string
  sources: DataSource[]
  isOpen: boolean
}

// Available data source types with their icons and descriptions
const availableDataSources = [
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    icon: '/icons/google-analytics.svg',
    description: 'Connect to Google Analytics 4 properties',
    details: 'Fetch website traffic data, user behavior metrics, conversion data, and more from your Google Analytics properties.',
    category: 'analytics'
  },
  {
    id: 'matomo-analytics',
    name: 'Matomo Analytics',
    icon: '/icons/matomo.svg',
    description: 'Connect to Matomo Analytics',
    details: 'Fetch website traffic data, user behavior metrics, and conversion data from Matomo.',
    category: 'analytics'
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    icon: '/icons/google-ads.svg',
    description: 'Connect to Google Ads API',
    details: 'Access campaign data, ad performance metrics, and conversion tracking from Google Ads.',
    category: 'advertising'
  },
  {
    id: 'facebook-ads',
    name: 'Facebook Ads',
    icon: '/icons/facebook-ads.svg',
    description: 'Connect to Meta Graph API',
    details: 'Import ad campaign data, audience insights, and performance metrics from Facebook Ads.',
    category: 'advertising'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '/icons/instagram.svg',
    description: 'Connect to Instagram Graph API',
    details: 'Access post performance, audience insights, and engagement metrics from Instagram.',
    category: 'social'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    icon: '/icons/hubspot.svg',
    description: 'Connect to HubSpot API',
    details: 'Access contacts, companies, deals, tickets, and marketing data from HubSpot.',
    category: 'crm'
  }
];

export default function DataSourcesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [connectedSources, setConnectedSources] = useState<Array<{id: string, component: React.ReactNode}>>([]);
  const [connectionsByType, setConnectionsByType] = useState<Record<string, Array<{id: string, component: React.ReactNode}>>>({});
  
  // Track group expansion state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Track Google Analytics connections being created
  const [isAddingGAConnection, setIsAddingGAConnection] = useState(false);
  const [gaConnectorKey, setGaConnectorKey] = useState(Date.now());
  const [currentDataSource, setCurrentDataSource] = useState<string | null>(null);
  
  // Handle toggling a group's expanded state
  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  // Handle adding a new connection
  const handleAddConnection = (dataSourceId: string) => {
    // Reset connector key to ensure fresh instance
    console.log(`Adding new connection for ${dataSourceId}`);
    setGaConnectorKey(Date.now());
    setCurrentDataSource(dataSourceId);
    
    // Only Google Analytics is implemented for now
    if (dataSourceId === 'google-analytics') {
      // Set isAddingGAConnection to true so we know to render the connector with skipInitialScreen=true
      setIsAddingGAConnection(true);
    } else {
      alert(`Adding ${dataSourceId} connections is not implemented yet.`);
    }
  };

  // DEBUG flag - verify all IDs are unique when adding connections
  const verifyUniqueIds = (connections: Array<{id: string}>, newId: string): boolean => {
    const ids = connections.map(c => c.id);
    const isUnique = !ids.includes(newId);
    if (!isUnique) {
      console.error(`ID CONFLICT: ${newId} already exists in`, ids);
    }
    return isUnique;
  };

  // Handle adding a new connection with duplicate checking
  const handleConnectionComplete = (connection: {id: string, component: React.ReactNode, type: string}) => {
    console.log("handleConnectionComplete called with:", {
      id: connection.id,
      type: connection.type,
      hasComponent: connection.component !== null
    });
    
    // Check if we're removing a connection (component is null)
    if (connection.component === null) {
      console.log(`Removing connection with ID ${connection.id}`);
      
      // Remove from overall connections
      setConnectedSources(prev => {
        const newSources = prev.filter(conn => conn.id !== connection.id);
        console.log(`After removal: ${newSources.length} total connections remaining`);
        return newSources;
      });
      
      // Remove from connections by type
      setConnectionsByType(prev => {
        const newConnectionsByType = {...prev};
        if (newConnectionsByType[connection.type]) {
          newConnectionsByType[connection.type] = newConnectionsByType[connection.type].filter(
            conn => conn.id !== connection.id
          );
          
          console.log(`After removal: ${newConnectionsByType[connection.type]?.length || 0} ${connection.type} connections remaining`);
          
          // If no more connections of this type, remove the type entry
          if (newConnectionsByType[connection.type].length === 0) {
            console.log(`Removing empty ${connection.type} category`);
            delete newConnectionsByType[connection.type];
          }
        }
        return newConnectionsByType;
      });
      
      return;
    }
    
    console.log("Adding new connection to state:", connection.id);
    
    // Add to overall connections, checking for duplicate IDs rigorously
    setConnectedSources(prev => {
      // Check if this connection ID already exists
      const existingIndex = prev.findIndex(conn => conn.id === connection.id);
      const existingConnection = existingIndex >= 0 ? prev[existingIndex] : null;
      
      // Validate that IDs are unique
      if (existingIndex >= 0) {
        console.log(`Updating existing connection with ID ${connection.id} at index ${existingIndex}`);
        // Replace the existing connection with the updated one
        const newConnections = [...prev];
        newConnections[existingIndex] = connection;
        console.log(`Updated connection at index ${existingIndex}, total connections: ${newConnections.length}`);
        return newConnections;
      } else {
        // This is a new connection
        console.log(`Adding new connection with ID ${connection.id}, no existing connection found`);
        
        // Verify uniqueness to be extra safe
        verifyUniqueIds(prev, connection.id);
        
        // Add to the array
        const newConnections = [...prev, connection];
        console.log(`Added new connection, now have ${newConnections.length} total connections`);
        console.log(`Connection IDs: ${newConnections.map(c => c.id).join(', ')}`);
        return newConnections;
      }
    });
    
    console.log("Adding connection to connectionsByType for type:", connection.type);
    
    // Add to connections by type, replacing any with the same ID
    setConnectionsByType(prev => {
      const newConnectionsByType = {...prev};
      if (!newConnectionsByType[connection.type]) {
        console.log(`Creating new category for ${connection.type}`);
        newConnectionsByType[connection.type] = [];
      }
      
      // Check if this connection ID already exists in this type
      const existingIndex = newConnectionsByType[connection.type].findIndex(
        conn => conn.id === connection.id
      );
      
      if (existingIndex >= 0) {
        console.log(`Updating existing ${connection.type} connection with ID ${connection.id} at index ${existingIndex}`);
        // Replace the existing connection with the updated one
        newConnectionsByType[connection.type][existingIndex] = connection;
      } else {
        console.log(`Adding new ${connection.type} connection with ID ${connection.id}, no existing connection found`);
        
        // Verify uniqueness to be extra safe
        verifyUniqueIds(newConnectionsByType[connection.type], connection.id);
        
        // This is a new connection, add it to the array
        newConnectionsByType[connection.type].push(connection);
        console.log(`Connection IDs for ${connection.type}: ${newConnectionsByType[connection.type].map(c => c.id).join(', ')}`);
      }
      
      console.log("Updated connectionsByType:", 
        Object.entries(newConnectionsByType)
          .map(([type, conns]) => `${type}: ${conns.length}`)
          .join(", ")
      );
      return newConnectionsByType;
    });
    
    // Auto-expand the group of the newly added connection
    setExpandedGroups(prev => {
      const newState = {
        ...prev,
        [connection.type]: true
      };
      console.log(`Auto-expanded group for ${connection.type}`);
      return newState;
    });
  };

  // Add debug button for connection diagnosis - hidden in production
  const debugConnections = () => {
    console.log("==== DEBUGGING CONNECTIONS ====");
    console.log("connectedSources:", connectedSources.map(conn => ({
      id: conn.id,
      // Access type safely since it might not be present in all connections
      type: (conn as any).type || 'unknown'
    })));
    
    console.log("connectionsByType:", Object.entries(connectionsByType).map(([type, connections]) => ({
      type,
      connections: connections.map(conn => conn.id)
    })));
    
    console.log("GA counter:", localStorage.getItem('ga_connection_count'));
  };
  
  // Add debug function to reset all connections - hidden in production
  const resetAllConnections = () => {
    console.log("Resetting all connections");
    setConnectedSources([]);
    setConnectionsByType({});
    localStorage.removeItem('ga_connection_count');
  };

  // Debug function to show all connectionsByType keys
  const debugConnectionKeys = () => {
    console.log("=== CONNECTION KEYS ===");
    console.log("connectionsByType keys:", Object.keys(connectionsByType));
    console.log("connectionsByType entries:", Object.entries(connectionsByType).map(([key, value]) => ({key, count: value.length})));
    console.log("dataSource names:", filteredDataSources.map(ds => ds.name));
    console.log("======================");
  };

  // Filter data sources based on search
  const filteredDataSources = availableDataSources.filter(ds => 
    ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ds.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add this as a new useEffect to log connection state changes
  useEffect(() => {
    // Log whenever connectionsByType changes
    console.log("connectionsByType updated:", 
      Object.entries(connectionsByType)
        .map(([type, conns]) => `${type}: ${conns.length} connections`)
        .join(", ")
    );
    
    // Log all connection IDs by type
    Object.entries(connectionsByType).forEach(([type, connections]) => {
      console.log(`Connection IDs for ${type}:`, connections.map(c => c.id).join(", "));
    });
  }, [connectionsByType]);

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-8">
        {/* Debug Tools - Only visible in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex flex-col gap-2 mb-4 p-2 border border-dashed border-yellow-300 bg-yellow-50">
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={debugConnections}
              >
                Debug Connections
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={resetAllConnections}
              >
                Reset Connections
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={debugConnectionKeys}
              >
                Debug Keys
              </Button>
            </div>
            
            {/* Visual connection debug info */}
            <div className="text-xs font-mono mt-2">
              <div>Connected Sources: {connectedSources.length}</div>
              <div>
                Connections by Type: 
                {Object.entries(connectionsByType).map(([type, conns]) => (
                  <span key={type} className="ml-2 bg-gray-200 px-1 rounded">
                    {type}: {conns.length}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Search bar */}
        <div className="flex justify-between items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search data sources..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Data sources with vertical bars */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Data Sources</h2>
          
          <div className="space-y-2">
            {filteredDataSources.map(dataSource => {
              // Get the connection type name that would be used
              const connectionType = dataSource.name;
              // Debug which connections are available for this type
              console.log(`Checking connections for ${connectionType}:`, 
                connectionsByType[connectionType] ? 
                connectionsByType[connectionType].length : 
                "none"
              );
              
              const connections = connectionsByType[connectionType] || [];
              const hasConnections = connections.length > 0;
              const isExpanded = expandedGroups[connectionType] !== false; // Default to expanded
              
              return (
                <div key={dataSource.id} className="border rounded-md overflow-hidden">
                  {/* Header with data source info */}
                  <div className="flex items-center justify-between p-4 bg-muted/20">
                    <div 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => {
                        if (hasConnections) {
                          toggleGroup(connectionType);
                        }
                      }}
                    >
                      <img 
                        src={dataSource.icon} 
                        alt={dataSource.name} 
                        className="w-6 h-6" 
                      />
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {dataSource.name}
                          {hasConnections && (
                            <Badge variant="outline" className="text-xs">
                              {connections.length}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {dataSource.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {hasConnections && (
                        <button 
                          className="p-1.5 rounded-md hover:bg-muted/50"
                          onClick={() => toggleGroup(connectionType)}
                        >
                          {isExpanded ? 
                            <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAddConnection(dataSource.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Connection
                      </Button>
                    </div>
                  </div>
                  
                  {/* Connections list (if expanded) */}
                  {hasConnections && isExpanded && (
                    <div className="border-t divide-y">
                      {connections.map(connection => {
                        console.log(`Rendering connection ${connection.id} for ${connectionType}`);
                        return (
                          <div key={connection.id} className="px-4 py-3 pl-12">
                            {connection.component}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Google Analytics Connector - Only rendered when adding a new connection */}
        {isAddingGAConnection && currentDataSource === 'google-analytics' && (
          <Dialog 
            open={true} 
            onOpenChange={(open) => {
              console.log("Dialog open state changed to:", open);
              if (!open) {
                console.log("Dialog closing, setting isAddingGAConnection to false");
                setIsAddingGAConnection(false);
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Connect to Google Analytics</DialogTitle>
                <DialogDescription>
                  You'll be redirected to Google to authenticate and grant access to your Google Analytics data.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-6">
                <GoogleAnalyticsConnector
                  key={gaConnectorKey}
                  onConnectionComplete={(connection) => {
                    console.log("GoogleAnalyticsConnector.onConnectionComplete fired with:", connection.id);
                    handleConnectionComplete(connection);
                    console.log("Setting isAddingGAConnection to false after connection completion");
                    setIsAddingGAConnection(false);
                  }}
                  skipInitialScreen={true}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

// Data source type options
const dataSourceTypes = [
  // Database Connectors
  { value: "mysql", label: "MySQL", category: "database" },
  { value: "postgresql", label: "PostgreSQL", category: "database" },
  { value: "mssql", label: "Microsoft SQL Server", category: "database" },
  { value: "oracle", label: "Oracle Database", category: "database" },
  { value: "mongodb", label: "MongoDB", category: "database" },
  { value: "cosmosdb", label: "Azure Cosmos DB", category: "database" },
  { value: "snowflake", label: "Snowflake", category: "database" },
  { value: "bigquery", label: "Google BigQuery", category: "database" },
  { value: "redshift", label: "Amazon Redshift", category: "database" },
  { value: "dynamodb", label: "Amazon DynamoDB", category: "database" },
  
  // API Connectors
  { value: "rest", label: "REST API", category: "api" },
  { value: "graphql", label: "GraphQL", category: "api" },
  { value: "odata", label: "OData", category: "api" },
  { value: "soap", label: "SOAP API", category: "api" },
  { value: "webhook", label: "Webhook", category: "api" },
  
  // Ads Platforms
  { value: "facebook-ads", label: "Facebook Ads", category: "ads" },
  { value: "google-ads", label: "Google Ads", category: "ads" },
  { value: "linkedin-ads", label: "LinkedIn Ads", category: "ads" },
  { value: "tiktok-ads", label: "TikTok Ads", category: "ads" },
  
  // Organic Social Media
  { value: "instagram", label: "Instagram", category: "social" },
  { value: "facebook", label: "Facebook", category: "social" },
  { value: "linkedin", label: "LinkedIn", category: "social" },
  { value: "youtube", label: "YouTube", category: "social" },
  
  // Other Sources
  { value: "hubspot", label: "HubSpot", category: "other" },
  { value: "matomo", label: "Matomo Analytics", category: "other" },
  { value: "shopify", label: "Shopify", category: "other" },
  { value: "google-search-console", label: "Google Search Console", category: "other" },
  { value: "active-campaign", label: "Active Campaign", category: "other" },
  { value: "gohighlevel", label: "GoHighLevel", category: "other" },
  { value: "zendesk", label: "Zendesk", category: "other" },
  { value: "survicate", label: "Survicate", category: "other" },
  
  // File Sources
  { value: "csv", label: "CSV File", category: "file" },
  { value: "excel", label: "Excel File", category: "file" },
  { value: "json", label: "JSON File", category: "file" },
  { value: "xml", label: "XML File", category: "file" },
  { value: "parquet", label: "Parquet File", category: "file" },
  { value: "s3", label: "Amazon S3", category: "file" },
  { value: "gcs", label: "Google Cloud Storage", category: "file" },
];

