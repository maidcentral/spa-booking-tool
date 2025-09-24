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

      console.log('🚀 Creating/Updating Lead...');
      console.time('createOrUpdateLead');
      console.time('🔐 Request serialization');
      const serializedData = JSON.stringify(requestData);
      console.timeEnd('🔐 Request serialization');
      console.log('📊 Request payload size:', serializedData.length, 'bytes');

      console.time('🌐 Network request');
      const networkStart = performance.now();

      const response = await fetchMaidCentralAPI('/api/Lead/CreateOrUpdate', token, {
        method: 'POST',
        body: serializedData,
        timeout: 15000 // 15 second timeout for lead creation
      });

      const networkEnd = performance.now();
      console.timeEnd('🌐 Network request');
      console.log(`📊 Network took: ${(networkEnd - networkStart).toFixed(2)}ms`);
      console.log('🗺 Response status:', response.status, response.statusText);
      console.log('📏 Response headers:', Object.fromEntries(response.headers.entries()));

      console.time('🔍 Response parsing');
      const responseData = await parseAPIResponse<LeadCreateResponse>(response, 'Lead CreateOrUpdate');
      console.timeEnd('🔍 Response parsing');

      console.timeEnd('createOrUpdateLead');
      console.log('✅ Lead API response received:', {
        isSuccess: responseData.IsSuccess,
        leadId: responseData.Result?.LeadId
      });

      // Check if the API returned a success flag
      if (responseData.IsSuccess === false) {
        console.warn('⚠️ Lead API returned failure:', responseData);
      }

      return responseData;

    } catch (error: any) {
      console.error('❌ Lead creation failed:', error.message);

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
      console.error('Failed to fetch customer sources:', error);
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
      console.error('Failed to fetch lead tags:', error);
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
    console.log('📝 createOrUpdateQuote called with token:', token ? 'present' : 'missing');
    console.log('📦 Quote request data size:', JSON.stringify(data).length, 'bytes');

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

      console.log('📋 Final request data being sent:', JSON.stringify(requestData, null, 2));

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
      console.log(`📊 Quote API took: ${(apiEnd - apiStart).toFixed(2)}ms`);
      console.log('📬 Quote API response status:', response.status);

      console.time('🔍 Response parsing');
      const responseData = await parseAPIResponse<QuoteCreateResponse>(response, 'Quote CreateOrUpdate');
      console.timeEnd('🔍 Response parsing');

      console.timeEnd('createOrUpdateQuote');
      console.log('✅ Quote API response received:', responseData);
      return responseData;

    } catch (error: any) {
      console.error('Exception in createOrUpdateQuote:', error);
      console.error('Error details:', {
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