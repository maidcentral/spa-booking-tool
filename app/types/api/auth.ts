// Authentication types for MaidCentral API

export interface TokenRequest {
  username: string;
  password: string;
  grant_type: 'password';
}

export interface TokenErrorResponse {
  error: string;
  error_description: string;
}

export interface LoginRequest {
  Email: string;
  Password: string;
  RememberMe: boolean;
  code: string;
  Provider: 'Phone Code';
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number; // seconds (typically 43200 = 12 hours)
  refresh_token: string;
  userName: string;
}

export interface RefreshTokenRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
}

export interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
  userName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userName: string | null;
}

export interface AuthConfig {
  email: string;
  password: string;
  phoneCode?: string;
  autoRefresh?: boolean;
  onAuthSuccess?: (token: AuthTokenResponse) => void;
  onAuthError?: (error: Error) => void;
}