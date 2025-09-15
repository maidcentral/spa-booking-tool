import { httpClient, HttpClient } from './http-client';
import { cacheManager, CacheManager } from './cache-manager';
import type {
  ScopeGroup,
  Scope,
  Question,
  RateModification,
  PostalCode,
  AvailabilitySlot,
  PriceCalculationRequest,
  PriceCalculationResponse,
  Lead,
  LeadCreateRequest,
  Quote,
  BookQuoteRequest,
  BookQuoteResponse,
  BillingTerm,
  AvailabilityRequest,
  ApiResponse
} from '@/app/types/api';
import type {
  AuthTokenResponse
} from '@/app/types/api/auth';

export class MaidCentralApiService {
  private http: HttpClient;
  private cache: CacheManager;
  private useProxy: boolean = true; // Use Next.js API routes as proxy
  private directApiEndpoints: Set<string> = new Set(); // Endpoints that bypass proxy
  private directApiClient?: HttpClient; // Direct API client for external calls
  
  // Cache TTL configurations (in milliseconds)
  private readonly CACHE_TTL = {
    SCOPE_GROUPS: 3600000,     // 1 hour
    SCOPES: 3600000,           // 1 hour
    QUESTIONS: 1800000,        // 30 minutes
    RATE_MODIFICATIONS: 1800000, // 30 minutes
    POSTAL_CODES: 86400000,    // 24 hours
    BILLING_TERMS: 3600000,    // 1 hour
    AVAILABILITY: 300000       // 5 minutes
  };

  constructor(http?: HttpClient, cache?: CacheManager) {
    this.http = http || httpClient;
    this.cache = cache || cacheManager;
    
    // If no http client was passed and we're using proxy, create one
    if (!http && this.useProxy) {
      const baseURL = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://localhost:3000'; // Default for server-side
      this.http = new HttpClient({ baseURL });
    }

    // Create direct API client for external calls
    this.directApiClient = new HttpClient({ 
      baseURL: 'https://api.maidcentral.net',
      timeout: 30000
    });
  }

  /**
   * Get all available scope groups (service categories)
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async getScopeGroups(forceRefresh = false): Promise<ScopeGroup[]> {
    const cacheKey = 'scopeGroups';

    if (!forceRefresh) {
      const cached = this.cache.get<ScopeGroup[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/scope-groups' : '/api/Lead/ScopeGroups';
      const response = await this.http.getWithRetry<any>(endpoint);
      
      // Handle proxy response format
      const scopeGroups = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      
      this.cache.set(cacheKey, scopeGroups, this.CACHE_TTL.SCOPE_GROUPS);
      return scopeGroups;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get scopes for a specific scope group
   * @param scopeGroupId - The scope group ID
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async getScopes(scopeGroupId: string, forceRefresh = false): Promise<Scope[]> {
    const cacheKey = `scopes_${scopeGroupId}`;

    if (!forceRefresh) {
      const cached = this.cache.get<Scope[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/scopes' : '/api/Lead/Scopes';
      const response = await this.http.getWithRetry<any>(endpoint, 3, {
        params: { scopeGroupId }
      });
      
      // Handle proxy response format
      const scopes = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      
      this.cache.set(cacheKey, scopes, this.CACHE_TTL.SCOPES);
      return scopes;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get questions for one or more scopes
   * @param scopeIds - Array of scope IDs
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async getQuestions(scopeIds: string[], forceRefresh = false): Promise<Question[]> {
    if (!scopeIds.length) {
      return [];
    }

    const cacheKey = `questions_${scopeIds.sort().join('_')}`;

    if (!forceRefresh) {
      const cached = this.cache.get<Question[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/questions' : '/api/Lead/Questions';
      const response = await this.http.getWithRetry<any>(endpoint, 3, {
        params: { scopeIds: scopeIds.join(',') }
      });
      
      // Handle proxy response format
      const questions = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      
      this.cache.set(cacheKey, questions, this.CACHE_TTL.QUESTIONS);
      return questions;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Calculate price based on selections
   * @param request - Price calculation request
   */
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResponse> {
    try {
      const endpoint = this.useProxy ? '/api/lead/calculate-price' : '/api/Lead/CalculatePrice';
      const response = await this.http.post<any>(endpoint, request);
      
      // Handle proxy response format
      return this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get rate modifications (add-ons/extras) for a scope
   * @param scopeId - The scope ID
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async getRateModifications(scopeId: string, forceRefresh = false): Promise<RateModification[]> {
    const cacheKey = `rateModifications_${scopeId}`;

    if (!forceRefresh) {
      const cached = this.cache.get<RateModification[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/rate-modifications' : '/api/Lead/RateModifications';
      const response = await this.http.getWithRetry<any>(endpoint, 3, {
        params: { scopeId }
      });
      
      // Handle proxy response format
      const modifications = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      
      this.cache.set(cacheKey, modifications, this.CACHE_TTL.RATE_MODIFICATIONS);
      return modifications;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Validate postal code and check if serviceable
   * @param code - Postal/ZIP code
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async validatePostalCode(code: string, forceRefresh = false): Promise<PostalCode | null> {
    const cacheKey = `postalCode_${code}`;

    if (!forceRefresh) {
      const cached = this.cache.get<PostalCode>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/postal-codes' : '/api/Lead/PostalCodes';
      const response = await this.http.getWithRetry<any>(endpoint, 3, {
        params: { code }
      });
      
      // Handle proxy response format
      const postalCodes = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      if (!postalCodes.length) {
        return null;
      }

      const postalCode = postalCodes[0];
      
      // Only cache and return if serviceable
      if (postalCode.isServiceable) {
        this.cache.set(cacheKey, postalCode, this.CACHE_TTL.POSTAL_CODES);
        return postalCode;
      }

      return null;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get available time slots
   * @param request - Availability request parameters
   */
  async getAvailability(request: AvailabilityRequest): Promise<AvailabilitySlot[]> {
    const cacheKey = `availability_${JSON.stringify(request)}`;
    
    const cached = this.cache.get<AvailabilitySlot[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/availability' : '/api/Lead/Availability';
      const response = await this.http.getWithRetry<any>(endpoint, 3, {
        params: request as any
      });
      
      // Handle proxy response format
      const availability = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      
      // Cache for short duration as availability changes frequently
      this.cache.set(cacheKey, availability, this.CACHE_TTL.AVAILABILITY);
      return availability;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Create or update a lead
   * @param lead - Lead information in MaidCentral API format
   */
  async createOrUpdateLead(lead: LeadCreateRequest | Lead): Promise<any> {
    try {
      const endpoint = this.useProxy ? '/api/lead/create-or-update' : '/api/Lead/CreateOrUpdate';
      
      // Convert to LeadCreateRequest format if needed
      let requestBody: LeadCreateRequest;
      if ('FirstName' in lead) {
        // Already in correct format
        requestBody = lead as LeadCreateRequest;
      } else {
        // Convert from Lead format to LeadCreateRequest format
        const leadData = lead as Lead;
        requestBody = {
          SendLeadEmail: false,
          TriggerWebhook: false,
          FirstName: leadData.firstName,
          LastName: leadData.lastName,
          Email: leadData.email,
          Phone: leadData.phone,
          PostalCode: leadData.address?.postalCode || ''
        };
      }
      
      const response = await this.http.postWithRetry<any>(endpoint, requestBody, 3);
      
      // Handle proxy response format
      return this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Create or update a quote
   * @param quote - Quote information
   */
  async createOrUpdateQuote(quote: Quote): Promise<Quote> {
    try {
      const endpoint = this.useProxy ? '/api/lead/create-or-update-quote' : '/api/Lead/CreateOrUpdateQuote';
      const response = await this.http.postWithRetry<any>(endpoint, quote, 3);
      
      // Handle proxy response format
      return this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get billing terms
   * @param forceRefresh - Skip cache and fetch fresh data
   */
  async getBillingTerms(forceRefresh = false): Promise<BillingTerm[]> {
    const cacheKey = 'billingTerms';

    if (!forceRefresh) {
      const cached = this.cache.get<BillingTerm[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const endpoint = this.useProxy ? '/api/lead/billing-terms' : '/api/Lead/BillingTerms';
      const response = await this.http.getWithRetry<any>(endpoint, 3);
      
      // Handle proxy response format
      const billingTerms = this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
      
      this.cache.set(cacheKey, billingTerms, this.CACHE_TTL.BILLING_TERMS);
      return billingTerms;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Book a quote
   * @param request - Booking request
   */
  async bookQuote(request: BookQuoteRequest): Promise<BookQuoteResponse> {
    try {
      const endpoint = this.useProxy ? '/api/lead/book-quote' : '/api/Lead/BookQuote';
      const response = await this.http.postWithRetry<any>(endpoint, request, 3);
      
      // Handle proxy response format
      return this.useProxy && response.data.success 
        ? response.data.data 
        : response.data;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific pattern
   * @param pattern - Cache key pattern
   */
  clearCacheByPattern(pattern: RegExp): void {
    this.cache.deleteByPattern(pattern);
  }

  /**
   * Set partner ID for tracking and partner-specific configuration
   * @param partnerId - Partner identifier
   */
  setPartnerId(partnerId: string | null): void {
    this.http.setPartnerId(partnerId);
  }

  /**
   * Set authentication token for both proxy and direct API clients
   * @param token - JWT token
   */
  setAuthToken(token: string | null): void {
    this.http.setAuthToken(token);
    this.directApiClient?.setAuthToken(token);
  }

  /**
   * Configure endpoints to bypass proxy and use direct API calls
   * @param endpoints - Array of endpoint names that should use direct API calls
   */
  setDirectApiForEndpoints(endpoints: string[]): void {
    this.directApiEndpoints = new Set(endpoints);
  }

  /**
   * Get the appropriate HTTP client for an endpoint
   * @param endpointType - Type of endpoint (e.g., 'token', 'login', 'lead')
   */
  private getClientForEndpoint(endpointType: string): HttpClient {
    if (this.directApiEndpoints.has(endpointType) && this.directApiClient) {
      return this.directApiClient;
    }
    return this.http;
  }

  /**
   * Get direct API client instance (for testing purposes)
   */
  getDirectApiClient(): HttpClient | undefined {
    return this.directApiClient;
  }

  /**
   * Get proxy API client instance (for testing purposes)
   */
  getProxyApiClient(): HttpClient {
    return this.http;
  }

  /**
   * Request authentication token (triggers SMS)
   * @param email - User email
   * @param password - User password
   */
  async requestAuthToken(email: string, password: string): Promise<void> {
    // Always use direct API client for authentication
    const client = this.directApiClient || this.http;
    const tokenRequest = {
      username: email,
      password: password,
      grant_type: 'password',
    };

    try {
      
      // Always use the direct external endpoint
      const response = await client.post('https://api.maidcentral.net/token', tokenRequest);
      
      // If we get a success response, that's unexpected for first attempt
      throw new Error('Expected SMS trigger but got success response instead');
    } catch (error: any) {
      
      // Handle expected 400 response that triggers SMS
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        
        // Check if this is the SMS trigger response
        if (errorData?.error === 'invalid_grant' || 
            errorData?.error_description?.includes('phone') ||
            errorData?.error_description?.includes('code') ||
            errorData?.error_description?.includes('SMS') ||
            errorData?.error_description?.includes('verification')) {
          return; // SMS was triggered successfully
        }
        
        // Other 400 errors
        throw new Error(`Authentication failed: ${errorData?.error_description || 'Invalid credentials'}`);
      }
      
      // Network or other errors
      if (!error.response) {
        throw new Error(`Network error: ${error.message}`);
      }
      
      throw this.handleApiError(error);
    }
  }

  /**
   * Authenticate with phone code
   * @param email - User email
   * @param password - User password
   * @param phoneCode - SMS verification code
   */
  async authenticateWithPhoneCode(email: string, password: string, phoneCode: string): Promise<AuthTokenResponse> {
    // Always use direct API client for authentication
    const client = this.directApiClient || this.http;
    const loginRequest = {
      Email: email,
      Password: password,
      RememberMe: true,
      code: phoneCode,
      Provider: 'Phone Code',
    };

    try {
      
      // Always use the direct external endpoint
      const response = await client.post('https://api.maidcentral.net/api/auth/login', loginRequest);
      
      
      // Store the access token for future requests
      if (response.data.access_token) {
        this.setAuthToken(response.data.access_token);
      }
      
      return response.data;
    } catch (error: any) {
      
      if (error.response?.status === 400 || error.response?.status === 401) {
        throw new Error('Authentication failed: Invalid credentials or phone code');
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * Handle API errors consistently
   * @param error - The error to handle
   */
  private handleApiError(error: any): Error {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Bad Request: ${data?.message || 'Invalid request parameters'}`);
        case 401:
          return new Error('Unauthorized: Please authenticate');
        case 403:
          return new Error('Forbidden: You do not have permission to access this resource');
        case 404:
          return new Error('Not Found: The requested resource does not exist');
        case 429:
          return new Error('Too Many Requests: Please try again later');
        case 500:
          return new Error('Server Error: An internal server error occurred');
        case 503:
          return new Error('Service Unavailable: The service is temporarily unavailable');
        default:
          return new Error(`API Error (${status}): ${data?.message || 'An error occurred'}`);
      }
    } else if (error.request) {
      // Request made but no response
      return new Error('Network Error: Unable to reach the server');
    } else {
      // Something else happened
      return new Error(`Error: ${error.message || 'An unexpected error occurred'}`);
    }
  }
}

// Create singleton instance with forced proxy configuration
// Always use localhost for proxy - no external API calls from browser
const proxyHttpClient = new HttpClient({ 
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
});

// Create and configure singleton instance
const apiInstance = new MaidCentralApiService(proxyHttpClient);

// Configure authentication endpoints to bypass proxy and hit external APIs directly
apiInstance.setDirectApiForEndpoints(['token', 'login']);

// Export configured singleton instance
export const maidCentralApi = apiInstance;