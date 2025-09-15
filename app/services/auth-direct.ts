/**
 * Direct MaidCentral API Authentication Service
 * Handles authentication through our server-side API route
 */

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
  message?: string;
}

export class DirectAuthService {
  
  /**
   * Authenticate using the server-side API route
   * This keeps API credentials secure on the server
   */
  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Authentication failed with status ${response.status}`
        };
      }

      if (data.success && data.token) {
return {
          success: true,
          token: data.token,
          message: 'Authentication successful'
        };
      }

      return {
        success: false,
        error: 'Invalid response from authentication server'
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error during authentication'
      };
    }
  }
}

// Export singleton instance
export const directAuthService = new DirectAuthService();