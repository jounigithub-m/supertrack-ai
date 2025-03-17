import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tenantApi, Tenant } from '../api/tenant';
import { useAuth } from './auth-context';

// Tenant state interface
export interface TenantState {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  isLoading: boolean;
  error: Error | null;
}

// Tenant context interface
export interface TenantContextProps extends TenantState {
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (name: string) => Promise<Tenant>;
  updateTenant: (id: string, name: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  clearError: () => void;
}

// Create context with default values
const TenantContext = createContext<TenantContextProps>({
  currentTenant: null,
  tenants: [],
  isLoading: true,
  error: null,
  switchTenant: async () => {},
  createTenant: async () => {
    throw new Error('Not implemented');
  },
  updateTenant: async () => {},
  refreshTenants: async () => {},
  clearError: () => {},
});

// Storage key for current tenant ID
const CURRENT_TENANT_KEY = 'current_tenant_id';

// Provider props interface
interface TenantProviderProps {
  children: ReactNode;
}

/**
 * Tenant Provider component that wraps the application
 */
export function TenantProvider({ children }: TenantProviderProps) {
  const [state, setState] = useState<TenantState>({
    currentTenant: null,
    tenants: [],
    isLoading: true,
    error: null,
  });
  
  const { isAuthenticated } = useAuth();
  
  // Load tenants when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadTenants();
    } else {
      // Reset state when not authenticated
      setState({
        currentTenant: null,
        tenants: [],
        isLoading: false,
        error: null,
      });
    }
  }, [isAuthenticated]);
  
  /**
   * Load all tenants and set current tenant
   */
  const loadTenants = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Fetch all tenants
      const tenants = await tenantApi.getAll();
      
      if (tenants.length === 0) {
        setState({
          currentTenant: null,
          tenants: [],
          isLoading: false,
          error: null,
        });
        return;
      }
      
      // Get stored tenant ID or use first tenant
      const storedTenantId = localStorage.getItem(CURRENT_TENANT_KEY);
      let currentTenant = tenants.find(t => t.id === storedTenantId) || tenants[0];
      
      // If current tenant not found in the list, use the first one
      if (!currentTenant) {
        currentTenant = tenants[0];
      }
      
      // Store the current tenant ID
      if (currentTenant) {
        localStorage.setItem(CURRENT_TENANT_KEY, currentTenant.id);
      }
      
      setState({
        currentTenant,
        tenants,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load tenants:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to load tenants'),
      }));
    }
  };
  
  /**
   * Switch to a different tenant
   */
  const switchTenant = async (tenantId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Call API to switch tenant
      const tenant = await tenantApi.switchTenant(tenantId);
      
      // Store the current tenant ID
      localStorage.setItem(CURRENT_TENANT_KEY, tenant.id);
      
      setState(prev => ({
        ...prev,
        currentTenant: tenant,
        isLoading: false,
      }));
      
      // Reload page to refresh data for new tenant
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to switch tenant'),
      }));
    }
  };
  
  /**
   * Create a new tenant
   */
  const createTenant = async (name: string): Promise<Tenant> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Create tenant via API
      const newTenant = await tenantApi.create({ name });
      
      // Update state with new tenant
      setState(prev => ({
        ...prev,
        tenants: [...prev.tenants, newTenant],
        isLoading: false,
      }));
      
      return newTenant;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to create tenant'),
      }));
      
      throw error;
    }
  };
  
  /**
   * Update tenant details
   */
  const updateTenant = async (id: string, name: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Update tenant via API
      const updatedTenant = await tenantApi.update(id, { name });
      
      // Update state with modified tenant
      setState(prev => {
        const updatedTenants = prev.tenants.map(t => 
          t.id === updatedTenant.id ? updatedTenant : t
        );
        
        const newCurrentTenant = prev.currentTenant?.id === updatedTenant.id
          ? updatedTenant
          : prev.currentTenant;
        
        return {
          ...prev,
          currentTenant: newCurrentTenant,
          tenants: updatedTenants,
          isLoading: false,
        };
      });
    } catch (error) {
      console.error('Failed to update tenant:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to update tenant'),
      }));
      
      throw error;
    }
  };
  
  /**
   * Refresh the list of tenants
   */
  const refreshTenants = async () => {
    await loadTenants();
  };
  
  /**
   * Clear current error
   */
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };
  
  // Provide tenant context to children
  return (
    <TenantContext.Provider
      value={{
        ...state,
        switchTenant,
        createTenant,
        updateTenant,
        refreshTenants,
        clearError,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to use the tenant context
 */
export function useTenant() {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  
  return context;
}

export default TenantContext; 