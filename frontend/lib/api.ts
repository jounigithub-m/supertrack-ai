import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Types
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  authToken?: string;
}

export interface RequestConfig extends AxiosRequestConfig {
  skipRetry?: boolean;
  skipAuth?: boolean;
  _retryCount?: number;
}

export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Type guard for checking if an object has a message property
function hasMessage(obj: any): obj is { message: string } {
  return obj && typeof obj.message === 'string';
}

// Main API client class
export class ApiClient {
  private instance: AxiosInstance;
  private config: ApiClientConfig;
  private authToken: string | null = null;
  
  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || API_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY,
    };
    
    if (config.authToken) {
      this.authToken = config.authToken;
    }
    
    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Request interceptor for auth token
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const typedConfig = config as InternalAxiosRequestConfig & { skipAuth?: boolean };
        if (!typedConfig.skipAuth && this.authToken) {
          config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );
    
    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RequestConfig;
        const retryCount = originalRequest._retryCount || 0;
        
        // Retry on network errors or 5xx errors, unless explicitly skipped
        if (
          !originalRequest.skipRetry &&
          (error.code === 'ECONNABORTED' || 
           !error.response || 
           (error.response?.status >= 500 && error.response?.status < 600)) &&
          retryCount < (this.config.maxRetries || MAX_RETRIES)
        ) {
          originalRequest._retryCount = retryCount + 1;
          
          const delay = (this.config.retryDelay || RETRY_DELAY) * Math.pow(2, retryCount);
          
          return new Promise((resolve) => {
            setTimeout(() => resolve(this.instance(originalRequest)), delay);
          });
        }
        
        // Transform error to a standardized ApiError
        if (error.response) {
          const errorData = error.response.data;
          const errorMessage = hasMessage(errorData) ? errorData.message : 'API request failed';
          
          throw new ApiError(
            errorMessage,
            error.response.status,
            errorData
          );
        } else if (error.request) {
          throw new ApiError('No response received from server', 0);
        } else {
          throw new ApiError(error.message || 'Unknown error occurred', 0);
        }
      }
    );
  }
  
  // Set auth token
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }
  
  // GET request
  async get<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }
  
  // POST request
  async post<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }
  
  // PUT request
  async put<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }
  
  // PATCH request
  async patch<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }
  
  // DELETE request
  async delete<T = any>(url: string, config: RequestConfig = {}): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

// Create and export default instance
const apiClient = new ApiClient();
export default apiClient; 