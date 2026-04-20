/**
 * fetch helpers for talking to the MaidCentral API:
 *  - `fetchWithTimeout` wraps fetch with an AbortController-based timeout and
 *    simple retry for transient network errors.
 *  - `fetchMaidCentralAPI` adds the auth bearer header and resolves the URL
 *    against `API_BASE_URL`.
 *  - `parseAPIResponse` unwraps the JSON body or throws a descriptive error.
 */

import { API_BASE_URL } from '@/app/lib/config/api-url';

export interface FetchOptions {
  method?: string;
  timeout?: number;
  headers?: Record<string, string>;
  body?: string;
  retries?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    timeout = 10000,
    headers = {},
    body,
    retries = 0,
  } = options;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  const finalHeaders: Record<string, string> = {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=1000',
    ...headers,
  };

  if (body && method !== 'GET') {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = {
    method,
    headers: finalHeaders,
    credentials: 'omit',
    signal: abortController.signal,
    keepalive: method === 'GET',
  };

  if (body) {
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${method} ${url}`);
    }

    if (retries > 0 && (error.name === 'TypeError' || error.name === 'NetworkError')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithTimeout(url, { ...options, retries: retries - 1 });
    }

    throw error;
  }
}

export async function fetchMaidCentralAPI(
  endpoint: string,
  authToken: string,
  options: Omit<FetchOptions, 'headers'> & {
    additionalHeaders?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { additionalHeaders = {}, ...fetchOptions } = options;

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Accept': 'application/json',
    ...additionalHeaders,
  };

  return fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    timeout: fetchOptions.timeout ?? 30000,
    retries: fetchOptions.retries ?? 0,
  });
}

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
    return (await response.json()) as T;
  } catch {
    throw new Error(`${apiName} API returned invalid JSON`);
  }
}
