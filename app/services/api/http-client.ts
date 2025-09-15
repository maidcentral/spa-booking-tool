import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, CancelTokenSource } from 'axios';

export interface HttpClientConfig extends AxiosRequestConfig {
  retryAttempts?: number;
  retryDelay?: number;
}

export class HttpClient {
  private instance: AxiosInstance;
  private partnerId: string | null = null;
  private authToken: string | null = null;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(config?: HttpClientConfig) {
    const defaultConfig: HttpClientConfig = {
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.maidcentral.net',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      retryAttempts: 3,
      retryDelay: 1000
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.retryAttempts = finalConfig.retryAttempts || 3;
    this.retryDelay = finalConfig.retryDelay || 1000;

    // Remove custom properties before passing to axios
    const { retryAttempts, retryDelay, ...axiosConfig } = finalConfig;
    
    this.instance = axios.create(axiosConfig);
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add bearer token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add partner ID header if available
        if (this.partnerId) {
          config.headers['X-Partner-Id'] = this.partnerId;
        }

        // Add referer for tracking which partner site the request comes from
        if (typeof window !== 'undefined' && document.referrer) {
          config.headers['X-Referrer'] = document.referrer;
        }

        // Request logging removed for performance

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        // Response logging removed for performance

        return response;
      },
      (error: AxiosError) => {
        // Error logging removed for performance

        // Handle 401 Unauthorized - token might be expired
        if (error.response?.status === 401) {
          // Dispatch event for token refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('token-expired'));
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public setPartnerId(partnerId: string | null): void {
    this.partnerId = partnerId;
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
    } else {
    }
  }

  public setRequestTransformer(transformer: (data: any) => any): void {
    this.instance.defaults.transformRequest = [transformer, ...axios.defaults.transformRequest as any[]];
  }

  public setResponseTransformer(transformer: (data: any) => any): void {
    this.instance.defaults.transformResponse = [...axios.defaults.transformResponse as any[], transformer];
  }

  public createCancelToken(): CancelTokenSource {
    return axios.CancelToken.source();
  }

  private async retryRequest<T>(
    fn: () => Promise<AxiosResponse<T>>,
    attempts: number = this.retryAttempts,
    delay: number = this.retryDelay
  ): Promise<AxiosResponse<T>> {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Don't retry on client errors (4xx)
      if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
        throw error;
      }

      // Don't retry if no attempts left
      if (attempts <= 1) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry with increased delay
      return this.retryRequest(fn, attempts - 1, delay * 2);
    }
  }

  // Standard HTTP methods
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  // HTTP methods with retry logic
  public async getWithRetry<T = any>(url: string, retries?: number, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.get<T>(url, config), retries);
  }

  public async postWithRetry<T = any>(url: string, data?: any, retries?: number, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.post<T>(url, data, config), retries);
  }

  public async putWithRetry<T = any>(url: string, data?: any, retries?: number, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.put<T>(url, data, config), retries);
  }

  public async patchWithRetry<T = any>(url: string, data?: any, retries?: number, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.patch<T>(url, data, config), retries);
  }

  public async deleteWithRetry<T = any>(url: string, retries?: number, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.delete<T>(url, config), retries);
  }

  // Utility method for handling form data
  public async postFormData<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // Utility method for downloading files
  public async downloadFile(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.get<Blob>(url, {
      ...config,
      responseType: 'blob'
    });
    return response.data;
  }
}

// Export a singleton instance
export const httpClient = new HttpClient();