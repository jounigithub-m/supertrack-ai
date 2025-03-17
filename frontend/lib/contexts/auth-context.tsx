import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, UserProfile } from '../api/auth';
import apiClient from '../api';

// Auth state interface
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: Error | null;
}

// Auth context interface
export interface AuthContextProps extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string, companyName: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  clearError: () => {},
});

// Token storage key
const TOKEN_KEY = 'auth_token';

// Provider props interface
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider component that wraps the application
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });
  
  const router = useRouter();
  
  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if token exists in storage
        const token = localStorage.getItem(TOKEN_KEY);
        
        if (!token) {
          setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
          return;
        }
        
        // Set token in API client
        apiClient.setAuthToken(token);
        
        // Fetch user profile
        const user = await authApi.getProfile();
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        
        // Clear token if invalid
        localStorage.removeItem(TOKEN_KEY);
        apiClient.setAuthToken(null);
        
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: error instanceof Error ? error : new Error('Authentication failed'),
        });
      }
    };
    
    initAuth();
  }, []);
  
  /**
   * Login with email and password
   */
  const login = async (email: string, password: string) => {
    try {
      setState({ ...state, isLoading: true, error: null });
      
      const response = await authApi.login({ email, password });
      
      // Store token
      localStorage.setItem(TOKEN_KEY, response.token);
      apiClient.setAuthToken(response.token);
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        error: null,
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Login failed'),
      });
      
      throw error;
    }
  };
  
  /**
   * Register a new user
   */
  const register = async (firstName: string, lastName: string, email: string, password: string, companyName: string) => {
    try {
      setState({ ...state, isLoading: true, error: null });
      
      const response = await authApi.register({
        firstName,
        lastName,
        email,
        password,
        companyName,
      });
      
      // Store token
      localStorage.setItem(TOKEN_KEY, response.token);
      apiClient.setAuthToken(response.token);
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        error: null,
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      
      setState({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Registration failed'),
      });
      
      throw error;
    }
  };
  
  /**
   * Logout the current user
   */
  const logout = async () => {
    try {
      setState({ ...state, isLoading: true });
      
      // Call logout API
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token regardless of API success
      localStorage.removeItem(TOKEN_KEY);
      apiClient.setAuthToken(null);
      
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
      
      // Redirect to login
      router.push('/login');
    }
  };
  
  /**
   * Clear current error
   */
  const clearError = () => {
    setState({ ...state, error: null });
  };
  
  // Provide auth context to children
  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use the auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext; 