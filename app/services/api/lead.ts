import type {
  LeadCreateRequest,
  LeadCreateResponse,
  CustomerSource,
  LeadTag,
  QuoteCreateRequest,
  QuoteCreateResponse
} from '@/app/types/api/lead'

import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';

/**
 * Lead API Service
 * Handles lead creation and management with MaidCentral API
 */
export const leadService = {
  /**
   * Create or update a lead
   * @param token Authentication token
   * @param data Lead creation data
   * @returns Promise with lead creation response
   */
  async createOrUpdate(token: string, data: LeadCreateRequest): Promise<LeadCreateResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      // Default values for optional fields
      const requestData: LeadCreateRequest = {
        SendLeadEmail: true,
        AddToCampaigns: true,
        TriggerWebhook: true,
        AllowDuplicates: false,
        ...data
      }

      const serializedData = JSON.stringify(requestData);

      const response = await fetchMaidCentralAPI('/api/Lead/CreateOrUpdate', token, {
        method: 'POST',
        body: serializedData,
        timeout: 15000 // 15 second timeout for lead creation
      });

      const responseData = await parseAPIResponse<LeadCreateResponse>(response, 'Lead CreateOrUpdate');

      return responseData;

    } catch (error: any) {

      // Return error response
      return {
        IsSuccess: false,
        ErrorMessage: error.message || 'Failed to create lead'
      }
    }
  },

  /**
   * Get available customer sources
   * @param token Authentication token
   * @returns Promise with list of customer sources
   */
  async getCustomerSources(token: string): Promise<CustomerSource[]> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      const endpoint = 'https://mccleaners.maidcentral.net/api/Lead/CustomerSources';

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Customer sources API failed with status ${response.status}`);
      }

      const data: CustomerSource[] = await response.json();
      return data;

    } catch (error) {
      // Failed to fetch customer sources
      return [];
    }
  },

  /**
   * Get available lead tags
   * @param token Authentication token
   * @returns Promise with list of lead tags (category 8)
   */
  async getLeadTags(token: string): Promise<LeadTag[]> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      const endpoint = 'https://mccleaners.maidcentral.net/api/Lead/Tags';

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`Lead tags API failed with status ${response.status}`);
      }

      const data: LeadTag[] = await response.json();
      // Filter for category 8 tags as specified in API docs
      return data.filter(tag => tag.CategoryId === 8);

    } catch (error) {
      // Failed to fetch lead tags
      return [];
    }
  },

  /**
   * Create or update a quote for a lead
   * @param token Authentication token
   * @param data Quote creation data
   * @returns Promise with quote creation response
   */
  async createOrUpdateQuote(token: string, data: QuoteCreateRequest): Promise<QuoteCreateResponse> {
    console.time('createOrUpdateQuote');
    // Creating or updating quote

    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      // Default values for optional fields
      const requestData: QuoteCreateRequest = {
        SendQuoteEmail: false, // Don't send immediately
        AddToCampaigns: true,
        TriggerWebhook: true,
        ...data
      };

      // Preparing quote request

      console.time('🌐 Quote API call');
      const apiStart = performance.now();

      // Use fetchMaidCentralAPI for optimized performance
      const response = await fetchMaidCentralAPI('/api/Lead/CreateOrUpdateQuote', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 30000, // 30 second timeout
        retries: 0 // No retries to avoid confusion
      });

      const apiEnd = performance.now();
      console.timeEnd('🌐 Quote API call');
      // Quote API call completed

      console.time('🔍 Response parsing');
      const responseData = await parseAPIResponse<QuoteCreateResponse>(response, 'Quote CreateOrUpdate');
      console.timeEnd('🔍 Response parsing');

      console.timeEnd('createOrUpdateQuote');
      // Quote API response received
      return responseData;

    } catch (error: any) {
      // Exception in createOrUpdateQuote
      console.error('Exception in createOrUpdateQuote', {
        message: error.message,
        stack: error.stack
      });

      // Return error response
      return {
        IsSuccess: false,
        ErrorMessage: error.message || 'Failed to create quote'
      };
    }
  }
}