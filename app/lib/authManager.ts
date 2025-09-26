/**
 * Global Authentication Manager
 * Singleton pattern to prevent duplicate auth calls and manage token caching
 */

interface AuthResult {
  success: boolean;
  token: string | null;
  error: string | null;
}

class AuthManager {
  private static instance: AuthManager;
  private currentAuthPromise: Promise<AuthResult> | null = null;
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;
  private isAuthenticating = false;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Authenticate with the API
   * Returns cached token if valid, otherwise makes new request
   * Deduplicates concurrent requests
   */
  public async authenticate(): Promise<AuthResult> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return {
        success: true,
        token: this.cachedToken,
        error: null
      };
    }

    // If we're already authenticating, return the same promise
    if (this.currentAuthPromise) {
      return this.currentAuthPromise;
    }

    // Start new authentication
    this.isAuthenticating = true;

    this.currentAuthPromise = this.performAuthentication();

    try {
      const result = await this.currentAuthPromise;
      return result;
    } finally {
      // Clean up the promise after completion
      this.currentAuthPromise = null;
      this.isAuthenticating = false;
    }
  }

  private async performAuthentication(): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data.error || `Authentication failed with status ${response.status}`;
        return {
          success: false,
          token: null,
          error
        };
      }

      if (data.success && data.token) {
        // Cache the token for 30 minutes
        this.cachedToken = data.token;
        this.tokenExpiry = Date.now() + (30 * 60 * 1000);

        return {
          success: true,
          token: data.token,
          error: null
        };
      } else {
        const error = 'Invalid response from authentication server';
        return {
          success: false,
          token: null,
          error
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to authenticate with MaidCentral';
      return {
        success: false,
        token: null,
        error: errorMessage
      };
    }
  }

  /**
   * Clear cached token (for logout)
   */
  public clearToken(): void {
    this.cachedToken = null;
    this.tokenExpiry = null;
    this.currentAuthPromise = null;
  }

  /**
   * Get current authentication status
   */
  public isAuthenticated(): boolean {
    return !!(this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry);
  }

  /**
   * Get cached token without making new request
   */
  public getCachedToken(): string | null {
    if (this.isAuthenticated()) {
      return this.cachedToken;
    }
    return null;
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();