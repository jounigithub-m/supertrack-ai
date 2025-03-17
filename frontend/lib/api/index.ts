import apiClient from '../api';
import authApi from './auth';
import tenantApi from './tenant';
import connectorsApi from './connectors';
import chatApi from './chat';

export { apiClient, authApi, tenantApi, connectorsApi, chatApi };

// Re-export types from individual modules
export * from './auth';
export * from './tenant';
export * from './connectors';
export * from './chat';

export default {
  auth: authApi,
  tenant: tenantApi,
  connectors: connectorsApi,
  chat: chatApi,
}; 