import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import apiClient, { ApiError } from '../api';
import { useAuth } from '../contexts/auth-context';

// Global fetcher function that uses our API client
const fetcher = async (url: string) => {
  try {
    return await apiClient.get(url);
  } catch (error) {
    throw error;
  }
};

// Type for SWR fetch hook response
export type SwrFetchResponse<Data> = SWRResponse<Data, ApiError> & {
  isLoading: boolean;
};

/**
 * Custom SWR hook for data fetching with our API client
 * Provides automatic error handling and loading state
 */
export function useSwrFetch<Data = any>(
  url: string | null, 
  config?: SWRConfiguration
): SwrFetchResponse<Data> {
  const { isAuthenticated } = useAuth();
  
  // Only fetch if URL is provided and user is authenticated
  const shouldFetch = !!url && isAuthenticated;
  const key = shouldFetch ? url : null;
  
  const { data, error, mutate, isValidating } = useSWR<Data, ApiError>(
    key, 
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000, // 5 seconds
      ...config,
    }
  );
  
  return {
    data,
    error,
    mutate,
    isValidating,
    isLoading: (!error && !data) || isValidating,
  };
}

/**
 * Utility for creating a paginated fetch hook
 */
export function usePaginatedFetch<Data = any[]>(
  baseUrl: string,
  page: number,
  pageSize: number,
  config?: SWRConfiguration
): SwrFetchResponse<Data> {
  const url = baseUrl ? `${baseUrl}?page=${page}&pageSize=${pageSize}` : null;
  return useSwrFetch<Data>(url, config);
}

/**
 * Utility for creating a filtered fetch hook
 */
export function useFilteredFetch<Data = any[], Filters = Record<string, any>>(
  baseUrl: string,
  filters: Filters,
  config?: SWRConfiguration
): SwrFetchResponse<Data> {
  // Convert filters to query params
  const queryParams = filters 
    ? Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&')
    : '';
  
  const url = baseUrl ? `${baseUrl}${queryParams ? `?${queryParams}` : ''}` : null;
  return useSwrFetch<Data>(url, config);
}

export default useSwrFetch; 