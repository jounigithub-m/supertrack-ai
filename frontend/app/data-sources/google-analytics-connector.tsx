import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Link2, RefreshCcw, MoreHorizontal, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  GoogleAnalyticsService, 
  GoogleAnalyticsAccount, 
  GoogleAnalyticsProperty 
} from "@/lib/services/google-analytics-service";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

// Mock data for testing
const MOCK_ACCOUNTS: GoogleAnalyticsAccount[] = [
  {
    id: "acc123",
    name: "ESGrapes",
  },
  {
    id: "acc456",
    name: "Personal Account",
  },
];

const MOCK_PROPERTIES: Record<string, GoogleAnalyticsProperty[]> = {
  "acc123": [
    { id: "prop1", name: "Main Website", accountId: "acc123", type: "GA4" },
    { id: "prop2", name: "Blog", accountId: "acc123", type: "GA4" },
  ],
  "acc456": [
    { id: "prop3", name: "Portfolio Site", accountId: "acc456", type: "GA4" },
  ]
};

interface GoogleAnalyticsConnectorProps {
  onConnectionComplete?: (connection: {id: string, component: React.ReactNode, type: string}) => void;
  skipInitialScreen?: boolean;
}

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  connectionDetails: {
    id: string;
    accountIds: string[];
    propertyIds: string[];
    name?: string;
  } | null;
  onSave: (selectedAccounts: string[], selectedProperties: string[], connectionName: string) => void;
}

// Edit Account & Properties Dialog
function EditConnectionDialog({ isOpen, onClose, connectionDetails, onSave }: EditDialogProps) {
  const [accounts, setAccounts] = useState<GoogleAnalyticsAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [allProperties, setAllProperties] = useState<GoogleAnalyticsProperty[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionName, setConnectionName] = useState<string>("");

  // Determine if this is an edit of an existing connection
  const isEditingExisting = connectionDetails && connectionDetails.accountIds.length > 0;

  // Load accounts on dialog open and pre-select from connectionDetails
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Reset selected ids to avoid stale state between opens
      setSelectedAccountIds([]);
      setSelectedPropertyIds([]);
      
      // Set initial connection name based on the existing details or a default
      if (connectionDetails?.name) {
        setConnectionName(connectionDetails.name);
      } else {
        // Generate a default name
        const count = parseInt(localStorage.getItem('ga_connection_count') || '0') + 1;
        setConnectionName(`Google Analytics Connection #${count}`);
      }
      
      // Mock loading accounts
      setTimeout(() => {
        setAccounts(MOCK_ACCOUNTS);
        
        // Pre-select account IDs if connection already has them
        if (connectionDetails && connectionDetails.accountIds.length > 0) {
          console.log("Pre-selecting accounts:", connectionDetails.accountIds);
          setSelectedAccountIds(connectionDetails.accountIds);
        }
        
        setIsLoading(false);
      }, 1000);
    }
  }, [isOpen, connectionDetails]);

  // Load properties when accounts are selected
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      setIsLoading(true);
      
      // Gather all properties from selected accounts
      const properties: GoogleAnalyticsProperty[] = [];
      selectedAccountIds.forEach(accountId => {
        if (MOCK_PROPERTIES[accountId]) {
          properties.push(...MOCK_PROPERTIES[accountId]);
        }
      });
      
      setAllProperties(properties);
      
      // Pre-select property IDs if connection already has them
      if (connectionDetails && connectionDetails.propertyIds.length > 0) {
        console.log("Pre-selecting properties:", connectionDetails.propertyIds);
        // Only select properties that are available from the selected accounts
        const availablePropertyIds = properties.map(prop => prop.id);
        const validPropertyIds = connectionDetails.propertyIds
          .filter(id => availablePropertyIds.includes(id));
        setSelectedPropertyIds(validPropertyIds);
      }
      
      setIsLoading(false);
    } else {
      setAllProperties([]);
      setSelectedPropertyIds([]);
    }
  }, [selectedAccountIds, connectionDetails]);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  // Toggle property selection
  const toggleProperty = (propertyId: string) => {
    setSelectedPropertyIds(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      } else {
        return [...prev, propertyId];
      }
    });
  };

  // Handle save
  const handleSave = () => {
    if (selectedAccountIds.length === 0 || selectedPropertyIds.length === 0) {
      setError("Please select at least one account and one property");
      return;
    }
    
    if (!connectionName.trim()) {
      setError("Please provide a name for the connection");
      return;
    }
    
    onSave(selectedAccountIds, selectedPropertyIds, connectionName.trim());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditingExisting 
              ? `Edit ${connectionDetails?.name || 'Google Analytics Connection'}`
              : "Configure Google Analytics Connection"
            }
          </DialogTitle>
          <DialogDescription>
            {isEditingExisting 
              ? "Select which accounts and properties you want to include in this connection."
              : "Select the accounts and properties you want to connect."
            }
            You can select multiple accounts and properties.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="connection-name">Connection Name</Label>
                <input
                  id="connection-name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="Enter a name for this connection"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Google Analytics Accounts</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                  {accounts.map(account => (
                    <div key={account.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <Checkbox 
                        id={`account-${account.id}`} 
                        checked={selectedAccountIds.includes(account.id)}
                        onCheckedChange={() => toggleAccount(account.id)}
                      />
                      <Label 
                        htmlFor={`account-${account.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {account.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              {allProperties.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Properties</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    {allProperties.map(property => (
                      <div key={property.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                        <Checkbox 
                          id={`property-${property.id}`} 
                          checked={selectedPropertyIds.includes(property.id)}
                          onCheckedChange={() => toggleProperty(property.id)}
                        />
                        <Label 
                          htmlFor={`property-${property.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">{property.name}</span>
                          <span className="text-xs text-muted-foreground block">
                            Account: {accounts.find(a => a.id === property.accountId)?.name}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || selectedAccountIds.length === 0 || selectedPropertyIds.length === 0 || !connectionName.trim()}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Loading...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function resetGoogleAnalyticsConnections() {
  localStorage.removeItem('ga_connection_count');
  console.log("Google Analytics connection counter reset");
}

export function GoogleAnalyticsConnector({ onConnectionComplete, skipInitialScreen = false }: GoogleAnalyticsConnectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // New state for the connection after authentication
  const [connectionDetails, setConnectionDetails] = useState<{
    id: string;
    name: string;
    status: string;
    lastSync: string;
    recordCount: number;
    accountIds: string[];
    propertyIds: string[];
    accounts?: {id: string, name: string}[];
    properties?: {id: string, name: string, accountId: string}[];
  } | null>(null);
  
  // State for edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Create a unique connector instance ID to distinguish it from other instances
  const [connectorInstanceId] = useState(`connector-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  console.log(`GoogleAnalyticsConnector instance created with ID: ${connectorInstanceId}`);

  const gaService = new GoogleAnalyticsService();

  // Check for OAuth callback parameters
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const provider = searchParams.get("provider");
    const session = searchParams.get("session");
    const error = searchParams.get("error");
    const connectingRequest = localStorage.getItem('ga_connecting_request');

    if (error) {
      setError(error);
      return;
    }

    if (oauth === "success" && provider === "google-analytics" && session) {
      console.log(`OAuth success detected in connector instance: ${connectorInstanceId}`);
      setSessionId(session);
      
      // Create a default connection immediately after successful authentication
      handleDefaultConnection(session);
      
      // Immediately remove the connecting request to avoid other instances picking it up
      localStorage.removeItem('ga_connecting_request');
      localStorage.removeItem('ga_connecting_instance');
    }
  }, [searchParams, connectorInstanceId]);

  // Auto-trigger authentication if skipInitialScreen is true
  useEffect(() => {
    if (skipInitialScreen && connectionStatus === "idle" && !isConnecting && !sessionId) {
      console.log("Auto-triggering Google authentication due to skipInitialScreen prop");
      handleConnect();
    }
  }, [skipInitialScreen, connectionStatus, isConnecting, sessionId]);

  // Update the handleConnect function to create a new unique connection each time
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Generate a unique connection request ID with the connector instance ID
      const requestId = `req-${connectorInstanceId}-${Date.now()}`;
      console.log(`Starting connection request from connector ${connectorInstanceId} with request ID: ${requestId}`);
      
      // Store the connection request ID in localStorage so we can track which connection is being set up
      localStorage.setItem('ga_connecting_request', requestId);
      localStorage.setItem('ga_connecting_instance', connectorInstanceId);
      
      const authUrl = await gaService.getAuthorizationUrl();
      
      // Redirect to Google's OAuth page
      window.location.href = authUrl;
    } catch (error) {
      console.error(`Failed to initiate OAuth flow from connector ${connectorInstanceId}:`, error);
      setError("Failed to connect to Google Analytics");
      setIsConnecting(false);
    }
  };

  // Create a default connection after authentication
  const handleDefaultConnection = async (session: string) => {
    setConnectionStatus("loading");
    console.log(`Creating default connection with session in connector ${connectorInstanceId}`);

    try {
      console.log("Session ID received:", session);
      
      // Generate a unique connection ID
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const uuid = 'xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
        return (Math.random() * 16 | 0).toString(16);
      });
      
      const connectionId = `ga-${connectorInstanceId}-${timestamp}-${random}-${uuid}`;
      console.log(`Generated unique connection ID: ${connectionId}`);

      // Count existing GA connections to name this one appropriately
      const existingCount = parseInt(localStorage.getItem('ga_connection_count') || '0');
      const newCount = existingCount + 1;
      localStorage.setItem('ga_connection_count', newCount.toString());
      console.log(`Connection count updated to: ${newCount}`);
      
      // Create a default connection name
      const connectionName = `Google Analytics Connection #${newCount}`;
      
      // Create a default connection with all accounts and properties
      // In a real implementation, you would fetch the actual accounts and properties from the API
      const selectedAccountIds = MOCK_ACCOUNTS.map(acc => acc.id);
      const allProperties: GoogleAnalyticsProperty[] = [];
      selectedAccountIds.forEach(accountId => {
        if (MOCK_PROPERTIES[accountId]) {
          allProperties.push(...MOCK_PROPERTIES[accountId]);
        }
      });
      const selectedPropertyIds = allProperties.map(prop => prop.id);
      
      // Create the connection details
      const details = {
        id: connectionId,
        name: connectionName,
        status: "Connected",
        lastSync: "Just now",
        recordCount: 0,
        accountIds: selectedAccountIds,
        propertyIds: selectedPropertyIds,
        accounts: MOCK_ACCOUNTS,
        properties: allProperties.map(prop => ({
          id: prop.id,
          name: prop.name,
          accountId: prop.accountId
        }))
      };
      
      console.log(`Created default connection with all accounts and properties:`, details);
      
      // Set connection details
      setConnectionDetails(details);
      setConnectionStatus("success");
      
      // Create and send the component to parent immediately
      if (onConnectionComplete) {
        console.log(`Adding default connection to parent from connector ${connectorInstanceId}`);
        
        // Create a component using our factory function
        const component = createConnectionComponent(details, connectionId);
        console.log("Component created successfully:", component ? "YES" : "NO");
        
        // Send the component to the parent
        // IMPORTANT: The type needs to match the keys in connectionsByType in the parent component
        // In page.tsx, connectionsByType uses dataSource.name as the key
        const connectionData = { 
          id: connectionId, 
          component,
          type: "Google Analytics"  // Must match exactly the name in availableDataSources
        };
        console.log("Calling onConnectionComplete with:", connectionData);
        onConnectionComplete(connectionData);
        
        // Reset the component state after success
        setTimeout(() => {
          setConnectionDetails(null);
          setConnectionStatus("idle");
          setSessionId(null);
          setIsConnecting(false);
          console.log("Connection state reset after successful creation");
        }, 500);
      } else {
        console.error("onConnectionComplete callback is not defined!");
      }

      // Clean up the URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      url.searchParams.delete("provider");
      url.searchParams.delete("session");
      router.push(url.pathname + url.search);
    } catch (error) {
      console.error(`Failed to create default connection:`, error);
      setError("Failed to create connection");
      setConnectionStatus("error");
    }
  };

  // Original handleInitialConnection renamed to handleSelectiveConnection
  const handleSelectiveConnection = async (session: string) => {
    // This function is no longer needed since we're creating the default connection automatically
    // and the editing functionality is handled by handleSaveConfiguration
  };

  // Handle saving account and property selection - this should be the only place that calls onConnectionComplete
  const handleSaveConfiguration = async (selectedAccounts: string[], selectedProperties: string[], connectionName: string) => {
    if (!connectionDetails) return;
    
    setConnectionStatus("loading");
    console.log(`Saving configuration in connector ${connectorInstanceId} for connection ${connectionDetails.id}`);
    
    try {
      // Create arrays to store account and property details
      const accountDetails = MOCK_ACCOUNTS.filter(acc => selectedAccounts.includes(acc.id));
      const propertyDetails: {id: string, name: string, accountId: string}[] = [];
      
      // Gather all properties from selected accounts
      selectedAccounts.forEach(accountId => {
        if (MOCK_PROPERTIES[accountId]) {
          const accountProperties = MOCK_PROPERTIES[accountId].filter(
            prop => selectedProperties.includes(prop.id)
          );
          accountProperties.forEach(prop => {
            propertyDetails.push({
              id: prop.id,
              name: prop.name,
              accountId: prop.accountId
            });
          });
        }
      });
      
      // Create the final connection with Connected status
      const updatedDetails = {
        ...connectionDetails,
        status: "Connected",
        lastSync: "Just now",
        accountIds: selectedAccounts,
        propertyIds: selectedProperties,
        accounts: accountDetails,
        properties: propertyDetails,
        name: connectionName
      };
      
      setConnectionDetails(updatedDetails);
      setConnectionStatus("success");
      
      // Create a completely new component using a factory function
      const createComponentForParent = () => {
        // This creates a completely standalone component that won't be affected by state changes
        return createConnectionComponent(updatedDetails, connectionDetails.id);
      };
      
      // This is the ONLY place we should add the connection to the parent
      if (onConnectionComplete) {
        console.log(`Adding updated connection to parent from connector ${connectorInstanceId}`);
        console.log(`Connection ID: ${connectionDetails.id}`);
        console.log(`Connection name: ${connectionName}`);
        console.log(`Selected accounts: ${selectedAccounts.join(', ')}`);
        console.log(`Selected properties: ${selectedProperties.join(', ')}`);
        
        // Send the factory function instead of a direct component
        onConnectionComplete({ 
          id: connectionDetails.id, 
          component: createComponentForParent(),
          type: "Google Analytics"  // Must match exactly the name in availableDataSources
        });
        
        // Reset the component state after successful connection to allow for a new connection
        setTimeout(() => {
          setConnectionDetails(null);
          setConnectionStatus("idle");
          setShowEditDialog(false);
          setSessionId(null);
          setIsConnecting(false);
        }, 500); // Small delay to avoid UI flicker
      }
    } catch (error) {
      console.error(`Failed to save configuration in connector ${connectorInstanceId}:`, error);
      setConnectionStatus("error");
    }
  };

  // Function to create the connection component
  const createConnectionComponent = (details: any, connectionId: string) => {
    console.log(`Creating connection component for ID: ${connectionId} with name: ${details.name} from connector ${connectorInstanceId}`);
    
    // IMPORTANT: We will create a completely independent component that won't share state
    // with the connector that created it
    
    // Create a new copy of the details to avoid reference sharing
    const connDetails = JSON.parse(JSON.stringify(details));
    
    // Store the original ID to ensure it doesn't change
    const id = connectionId;
    
    // Create a standalone edit handler for this connection
    const handleEdit = () => {
      console.log(`Edit button clicked for connection ${id}`);
      
      // Create a dialog for editing this specific connection
      const dialogRoot = document.createElement('div');
      dialogRoot.id = `edit-dialog-${id}`;
      document.body.appendChild(dialogRoot);
      
      const showEditDialog = true;
      const connectionToEdit = {
        id: connDetails.id,
        name: connDetails.name,
        accountIds: connDetails.accountIds,
        propertyIds: connDetails.propertyIds,
      };
      
      const editDialog = (
        <EditConnectionDialog
          isOpen={showEditDialog}
          onClose={() => {
            // Close and clean up
            document.body.removeChild(dialogRoot);
          }}
          connectionDetails={connectionToEdit}
          onSave={(accounts, properties, name) => {
            // Update the connection details
            console.log(`Updating connection ${id} with new configuration`);
            console.log(`New name: ${name}`);
            console.log(`New accounts: ${accounts.join(', ')}`);
            console.log(`New properties: ${properties.join(', ')}`);
            
            // Update the local details
            connDetails.name = name;
            connDetails.accountIds = accounts;
            connDetails.propertyIds = properties;
            
            // Create updated component
            const updatedComponent = createConnectionComponent(connDetails, id);
            
            // Send update to parent
            if (onConnectionComplete) {
              onConnectionComplete({
                id: id,
                component: updatedComponent,
                type: "Google Analytics"
              });
            }
            
            // Close and clean up
            document.body.removeChild(dialogRoot);
          }}
        />
      );
      
      // Render the dialog
      // Note: In a real implementation, you would use ReactDOM.render or similar
      // For this example, we're just showing the concept
      console.log(`Would render edit dialog for ${id} with:`, editDialog);
      
      // For now, just alert the user
      alert(`Editing connection ${connDetails.name} is not fully implemented in this demo.`);
    };
    
    // Create a standalone sync handler for this connection
    const handleSync = () => {
      console.log(`Sync button clicked for connection ${id}`);
      
      // Update the last sync time
      connDetails.lastSync = "Just now";
      
      // Create updated component
      const updatedComponent = createConnectionComponent(connDetails, id);
      
      // Send update to parent
      if (onConnectionComplete) {
        onConnectionComplete({
          id: id,
          component: updatedComponent,
          type: "Google Analytics"
        });
      }
    };
    
    // Create a standalone disconnect handler for this connection
    const handleDisconnect = () => {
      console.log(`Disconnect button clicked for connection ${id}`);
      
      // Decrease the connection counter
      const existingCount = parseInt(localStorage.getItem('ga_connection_count') || '0');
      if (existingCount > 0) {
        localStorage.setItem('ga_connection_count', (existingCount - 1).toString());
      }
      
      // Tell parent to remove this connection
      if (onConnectionComplete) {
        onConnectionComplete({
          id: id,
          component: null,
          type: "Google Analytics"
        });
      }
    };
    
    // Return a new component instance that's completely standalone
    return (
      <Card key={`ga-card-${id}`} className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <img 
                  src="/icons/google-analytics.svg" 
                  alt="Google Analytics" 
                  className="w-5 h-5"
                />
                {connDetails.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Last sync: {connDetails.lastSync}
              </CardDescription>
            </div>
            <Badge 
              variant={connDetails.status === "Connected" ? "outline" : "secondary"}
              className={connDetails.status === "Connected" 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-amber-50 text-amber-700 border-amber-200"
              }
            >
              {connDetails.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Records:</span>
            <span>{connDetails.recordCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Accounts:</span>
            <span>{connDetails.accountIds ? connDetails.accountIds.length : 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Properties:</span>
            <span>{connDetails.propertyIds ? connDetails.propertyIds.length : 0}</span>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 py-2 flex justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Settings className="mr-2 h-4 w-4" />
                Edit Configuration
              </DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Sync
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <>
      {/* The connector card shown in the data sources list */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <img 
              src="/icons/google-analytics.svg" 
              alt="Google Analytics" 
              className="w-6 h-6"
            />
            Google Analytics
          </CardTitle>
          <CardDescription>
            Connect to Google Analytics 4 properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fetch website traffic data, user behavior metrics, conversion data, and more from your Google Analytics 4 properties.
          </p>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        {!skipInitialScreen && (
          <CardFooter className="border-t bg-muted/50 py-3">
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || connectionStatus === "loading"}
              className="w-full"
              variant="outline"
            >
              {isConnecting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Connecting...
                </>
              ) : connectionStatus === "loading" ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect to Google
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Edit connection dialog */}
      {connectionDetails && (
        <EditConnectionDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            // If we're in the middle of a new connection and cancel, reset everything
            if (connectionDetails.accountIds.length === 0 && connectionDetails.propertyIds.length === 0) {
              setConnectionDetails(null);
              setConnectionStatus("idle");
            }
          }}
          connectionDetails={connectionDetails}
          onSave={handleSaveConfiguration}
        />
      )}
    </>
  );
} 