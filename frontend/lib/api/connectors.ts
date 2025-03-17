import apiClient from '../api';

export type ConnectorType = 
  | 'facebook_ads' 
  | 'google_ads'
  | 'linkedin_ads'
  | 'tiktok_ads'
  | 'meta_graph'
  | 'twitter'
  | 'youtube'
  | 'google_analytics'
  | 'matomo'
  | 'hubspot'
  | 'shopify'
  | 'active_campaign'
  | 'google_search_console'
  | 'amazon_rds'
  | 'gohighlevel'
  | 'zendesk'
  | 'survicate'
  | 'custom';

export type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface Connector {
  id: string;
  tenantId: string;
  name: string;
  type: ConnectorType;
  status: ConnectorStatus;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  config: ConnectorConfig;
  syncStatus?: SyncStatus;
}

export interface ConnectorConfig {
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
  scheduleEnabled?: boolean;
  scheduleFrequency?: 'hourly' | 'daily' | 'weekly';
}

export interface SyncStatus {
  inProgress: boolean;
  lastSync: {
    startedAt: string | null;
    completedAt: string | null;
    status: 'success' | 'failed' | 'partial' | 'pending';
    recordsProcessed: number;
    errorMessage?: string;
  };
}

export interface ConnectorCreateRequest {
  name: string;
  type: ConnectorType;
  config: ConnectorConfig;
}

export interface ConnectorUpdateRequest {
  name?: string;
  config?: Partial<ConnectorConfig>;
  status?: ConnectorStatus;
}

export interface ConnectorTestResponse {
  success: boolean;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Data Source Connectors API services
 */
export const connectorsApi = {
  /**
   * Get all connectors for the current tenant
   */
  getAll: () => 
    apiClient.get<Connector[]>('/connectors'),
  
  /**
   * Get available connector types with metadata
   */
  getAvailableTypes: () => 
    apiClient.get<{ type: ConnectorType; name: string; description: string; icon: string }[]>('/connectors/types'),
  
  /**
   * Get connector by ID
   */
  getById: (id: string) => 
    apiClient.get<Connector>(`/connectors/${id}`),
  
  /**
   * Create a new connector
   */
  create: (data: ConnectorCreateRequest) => 
    apiClient.post<Connector>('/connectors', data),
  
  /**
   * Update an existing connector
   */
  update: (id: string, data: ConnectorUpdateRequest) => 
    apiClient.patch<Connector>(`/connectors/${id}`, data),
  
  /**
   * Delete a connector
   */
  delete: (id: string) => 
    apiClient.delete(`/connectors/${id}`),
  
  /**
   * Test a connector connection
   */
  testConnection: (id: string) => 
    apiClient.post<ConnectorTestResponse>(`/connectors/${id}/test`),
  
  /**
   * Start a manual sync for a connector
   */
  startSync: (id: string) => 
    apiClient.post<{ jobId: string }>(`/connectors/${id}/sync`),
  
  /**
   * Get sync status for a connector
   */
  getSyncStatus: (id: string) => 
    apiClient.get<SyncStatus>(`/connectors/${id}/sync-status`),
  
  /**
   * Get sync history for a connector
   */
  getSyncHistory: (id: string, limit?: number) => 
    apiClient.get<SyncStatus[]>(`/connectors/${id}/sync-history`, { params: { limit } }),
  
  /**
   * Cancel an ongoing sync for a connector
   */
  cancelSync: (id: string) => 
    apiClient.post(`/connectors/${id}/cancel-sync`),
};

export default connectorsApi; 