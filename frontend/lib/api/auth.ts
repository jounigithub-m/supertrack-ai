import apiClient from '../api';

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration extends UserCredentials {
  firstName: string;
  lastName: string;
  companyName: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface TokenData {
  token: string;
  expiresAt: string;
}

/**
 * Authentication API services
 */
export const authApi = {
  /**
   * Login with user credentials
   */
  login: (credentials: UserCredentials) => 
    apiClient.post<AuthResponse>('/auth/login', credentials),
  
  /**
   * Register a new user
   */
  register: (userData: UserRegistration) => 
    apiClient.post<AuthResponse>('/auth/register', userData),
  
  /**
   * Get current authenticated user profile
   */
  getProfile: () => 
    apiClient.get<UserProfile>('/auth/profile'),
  
  /**
   * Refresh auth token
   */
  refreshToken: () => 
    apiClient.post<TokenData>('/auth/refresh'),
  
  /**
   * Logout current user
   */
  logout: () => 
    apiClient.post('/auth/logout'),
};

export default authApi; 