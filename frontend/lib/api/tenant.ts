import apiClient from '../api';

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: TenantStatus;
  settings: TenantSettings;
}

export type TenantStatus = 'active' | 'suspended' | 'pending';

export interface TenantSettings {
  brandColors: {
    primary: string;
    secondary: string;
  };
  features: {
    [key: string]: boolean;
  };
  limits: {
    maxUsers: number;
    maxStorage: number;
  };
}

export interface CreateTenantRequest {
  name: string;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
}

/**
 * Tenant management API services
 */
export const tenantApi = {
  /**
   * Get all tenants for current user
   */
  getAll: () => 
    apiClient.get<Tenant[]>('/tenant'),
  
  /**
   * Get tenant by ID
   */
  getById: (id: string) => 
    apiClient.get<Tenant>(`/tenant/${id}`),
  
  /**
   * Create a new tenant
   */
  create: (data: CreateTenantRequest) => 
    apiClient.post<Tenant>('/tenant', data),
  
  /**
   * Update an existing tenant
   */
  update: (id: string, data: UpdateTenantRequest) => 
    apiClient.patch<Tenant>(`/tenant/${id}`, data),
  
  /**
   * Delete a tenant
   */
  delete: (id: string) => 
    apiClient.delete(`/tenant/${id}`),
  
  /**
   * Get current active tenant
   */
  getCurrent: () => 
    apiClient.get<Tenant>('/tenant/current'),
  
  /**
   * Switch to a different tenant
   */
  switchTenant: (id: string) => 
    apiClient.post<Tenant>('/tenant/switch', { tenantId: id }),
};

export default tenantApi; 