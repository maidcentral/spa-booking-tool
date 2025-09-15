'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  logout: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthenticationProviderProps {
  children: ReactNode;
}

export function AuthenticationProvider({ children }: AuthenticationProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    token: null,
  });
  const [hasInitialized, setHasInitialized] = useState(false);

  const authenticate = async () => {
    // Prevent multiple authentication attempts
    if (hasInitialized) {
      return;
    }
    
    try {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null
      }));
      
      
      // Call our server-side API route that has access to secure env variables
      const response = await fetch('/api/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Authentication failed with status ${response.status}`);
      }

      if (data.success && data.token) {
        setHasInitialized(true);
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          token: data.token,
        });
      } else {
        throw new Error('Invalid response from authentication server');
      }
      
    } catch (error: any) {
      setHasInitialized(true);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Failed to authenticate with MaidCentral',
        token: null,
      });
    }
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
    });
  };

  const retry = () => {
    setHasInitialized(false);
    authenticate();
  };

  // Automatically authenticate on mount
  useEffect(() => {
    authenticate();
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    logout,
    retry,
  };

  // Show loading state
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connecting to MaidCentral</h2>
            <p className="text-gray-600">Authenticating with API credentials...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (authState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Failed</h2>
            <p className="text-gray-600 mb-4">{authState.error}</p>
            <button
              onClick={retry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry Authentication
            </button>
            <div className="mt-4 text-sm text-gray-500">
              <p>Please ensure API_USERNAME and API_KEY are configured in your environment variables.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authenticated, provide context and render children
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthenticationProvider');
  }
  return context;
}