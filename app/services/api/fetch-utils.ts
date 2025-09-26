/**
 * Utility functions for optimized API requests
 * Addresses performance issues with slow API calls
 */

export interface FetchOptions {
  method?: string;
  timeout?: number;
  headers?: Record<string, string>;
  body?: string;
  retries?: number;
}

/**
 * Enhanced fetch with timeout, connection reuse, and error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    timeout = 10000, // 10 second default timeout
    headers = {},
    body,
    retries = 0
  } = options;

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  // Optimized headers to prevent unnecessary preflight requests
  const optimizedHeaders: Record<string, string> = {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=1000',
    ...headers
  };

  // Only add Content-Type for requests with body
  if (body && method !== 'GET') {
    optimizedHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers: optimizedHeaders,
    credentials: 'omit', // Avoid unnecessary credential checks
    signal: abortController.signal,
    // Enable connection reuse
    keepalive: method === 'GET',
  };

  if (body) {
    fetchOptions.body = body;
  }

  try {
    console.time(`API-${method}-${url}`);
    const response = await fetch(url, fetchOptions);
    console.timeEnd(`API-${method}-${url}`);

    clearTimeout(timeoutId);

    // Check for slow responses (but don't log in production)

    return response;

  } catch (error: any) {
    clearTimeout(timeoutId);

    // Handle timeout specifically
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${method} ${url}`);
    }

    // Retry logic for network errors (not for 4xx/5xx)
    if (retries > 0 && (error.name === 'TypeError' || error.name === 'NetworkError')) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return fetchWithTimeout(url, { ...options, retries: retries - 1 });
    }

    throw error;
  }
}

/**
 * Optimized fetch for MaidCentral API calls
 */
export async function fetchMaidCentralAPI(
  endpoint: string,
  authToken: string,
  options: Omit<FetchOptions, 'headers'> & {
    additionalHeaders?: Record<string, string>
  } = {}
): Promise<Response> {
  const { additionalHeaders = {}, ...fetchOptions } = options;

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'application/json',
    ...additionalHeaders
  };

  const fullUrl = `https://mccleaners.maidcentral.net${endpoint}`

  const result = await fetchWithTimeout(
    fullUrl,
    {
      ...fetchOptions,
      headers,
      timeout: 30000, // Increased to 30 second timeout
      retries: 0 // Remove retries to avoid confusion in timing
    }
  );

  // Request completed successfully

  return result;
}

/**
 * Utility to handle API response parsing with better error messages
 */
export async function parseAPIResponse<T>(response: Response, apiName: string): Promise<T> {
  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorText = await response.text();
      errorMessage = `${apiName} API failed with status ${response.status}: ${errorText}`;
    } catch {
      errorMessage = `${apiName} API failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  try {
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`${apiName} API returned invalid JSON`);
  }
}