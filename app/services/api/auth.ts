import axios, { AxiosInstance } from 'axios';
import type {
  TokenRequest,
  LoginRequest,
  AuthTokenResponse,
  RefreshTokenRequest,
  StoredToken,
  AuthConfig,
} from '@/app/types/api/auth';

export class AuthService {
  private authClient: AxiosInstance;
  private token: StoredToken | null = null;
  private refreshTimer?: NodeJS.Timeout;
  private isRefreshing = false;
  private refreshPromise: Promise<StoredToken> | null = null;

  constructor(baseURL?: string) {
    this.authClient = axios.create({
      baseURL: baseURL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.maidcentral.net',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Complete authentication flow including phone code verification
   */
  async authenticate(config: AuthConfig): Promise<AuthTokenResponse> {
    try {
      // If no phone code provided, trigger SMS first
      if (!config.phoneCode) {
        
        try {
          // Step 1: Request token (this should trigger phone code)
          await this.requestInitialToken(config.email, config.password);
          
          // If we get here without error, SMS should be triggered
          throw new Error('Phone code has been sent to your registered phone');
        } catch (error: any) {
          // Re-throw with appropriate message
          if (error.message.includes('Phone code has been sent')) {
            throw error;
          }
          throw new Error(`Failed to trigger SMS: ${error.message}`);
        }
      }
      
      // Step 2: Login with phone code
      const tokenResponse = await this.loginWithPhoneCode(
        config.email,
        config.password,
        config.phoneCode
      );

      // Store token
      this.storeToken(tokenResponse);

      // Set up auto-refresh if enabled
      if (config.autoRefresh !== false) {
        this.scheduleTokenRefresh();
      }

      // Call success callback
      config.onAuthSuccess?.(tokenResponse);

      return tokenResponse;
    } catch (error) {
      config.onAuthError?.(error as Error);
      throw error;
    }
  }

  /**
   * Step 1: Request initial token (triggers phone code)
   */
  private async requestInitialToken(email: string, password: string): Promise<void> {
    const tokenRequest: TokenRequest = {
      username: email,
      password: password,
      grant_type: 'password',
    };

    const url = this.authClient.defaults.baseURL + '/token';

    try {
      // This endpoint returns 400 and sends phone code
      const response = await this.authClient.post('/token', tokenRequest);
      // If we got a success response, that's actually unexpected for first attempt
      throw new Error('Expected SMS trigger but got success response instead');
    } catch (error: any) {
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        
        // Check if this is the phone code trigger response
        if (errorData?.error === 'invalid_grant' || 
            errorData?.error_description?.includes('phone') ||
            errorData?.error_description?.includes('code') ||
            errorData?.error_description?.includes('SMS')) {
          return;
        }
        
        // Other 400 errors
        throw new Error(`Authentication failed: ${errorData?.error_description || 'Invalid credentials'}`);
      }
      
      // Network or other errors
      if (!error.response) {
        throw new Error(`Network error: ${error.message}`);
      }
      
      throw new Error(`API error (${error.response?.status}): ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Step 2: Login with phone code
   */
  private async loginWithPhoneCode(
    email: string,
    password: string,
    code: string
  ): Promise<AuthTokenResponse> {
    const loginRequest: LoginRequest = {
      Email: email,
      Password: password,
      RememberMe: true,
      code: code,
      Provider: 'Phone Code',
    };

    try {
      const response = await this.authClient.post<AuthTokenResponse>(
        '/api/auth/login',
        loginRequest
      );
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid phone code or credentials');
      }
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshToken(): Promise<StoredToken> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.isRefreshing = false;
      this.refreshPromise = null;
      throw error;
    }
  }

  private async performTokenRefresh(): Promise<StoredToken> {
    if (!this.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const refreshRequest: RefreshTokenRequest = {
      grant_type: 'refresh_token',
      refresh_token: this.token.refreshToken,
    };

    try {
      const response = await this.authClient.post<AuthTokenResponse>(
        '/token',
        refreshRequest
      );
      
      this.storeToken(response.data);
      this.scheduleTokenRefresh();
      
      return this.token!;
    } catch (error: any) {
      this.clearToken();
      throw new Error('Failed to refresh token. Please re-authenticate.');
    }
  }

  /**
   * Store token and calculate expiration
   */
  private storeToken(tokenResponse: AuthTokenResponse): void {
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
    
    this.token = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt,
      userName: tokenResponse.userName,
    };

    // Store in session storage for persistence across page refreshes
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('maidcentral_token', JSON.stringify(this.token));
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.token) {
      return;
    }

    // Refresh 5 minutes before expiration
    const refreshIn = this.token.expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch(error => {
        });
      }, refreshIn);
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    // Check session storage first
    if (!this.token && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('maidcentral_token');
      if (stored) {
        try {
          this.token = JSON.parse(stored);
          // Check if not expired
          if (this.token && this.token.expiresAt > Date.now()) {
            this.scheduleTokenRefresh();
          } else {
            this.clearToken();
          }
        } catch (error) {
        }
      }
    }

    if (!this.token) {
      return null;
    }

    // Check if token is expired
    if (this.token.expiresAt <= Date.now()) {
      this.clearToken();
      return null;
    }

    return this.token.accessToken;
  }

  /**
   * Get current user name
   */
  getUserName(): string | null {
    return this.token?.userName || null;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.token = null;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('maidcentral_token');
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.clearToken();
  }

  /**
   * Get token expiration time in milliseconds
   */
  getTokenExpiration(): number | null {
    if (!this.token) {
      return null;
    }
    
    const remaining = this.token.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Manually set a token (useful for testing or server-side auth)
   */
  setToken(tokenResponse: AuthTokenResponse): void {
    this.storeToken(tokenResponse);
    this.scheduleTokenRefresh();
  }
}

// Export singleton instance
export const authService = new AuthService();