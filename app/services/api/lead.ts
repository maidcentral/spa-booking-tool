import type {
  LeadCreateRequest,
  LeadCreateResponse,
  CustomerSource,
  LeadTag,
  QuoteCreateRequest,
  QuoteCreateResponse,
} from '@/app/types/api/lead';

import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';
import { API_BASE_URL } from '@/app/lib/config/api-url';

/**
 * Lead + quote API calls.
 *
 * `createOrUpdate` hits `POST /api/Lead/CreateOrUpdate` to create or update a
 * lead record; the returned `Result.LeadId` is then passed to the quote endpoint.
 *
 * `createOrUpdateQuote` hits `POST /api/Lead/CreateOrUpdateQuote` to attach a
 * priced quote (scopes, frequencies, questions, payment token) to a lead. The
 * returned `Result.QuoteId` is what `BookQuote` later confirms.
 */
export const leadService = {
  async createOrUpdate(token: string, data: LeadCreateRequest): Promise<LeadCreateResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const requestData: LeadCreateRequest = {
        SendLeadEmail: true,
        AddToCampaigns: true,
        TriggerWebhook: true,
        AllowDuplicates: false,
        ...data,
      };

      const response = await fetchMaidCentralAPI('/api/Lead/CreateOrUpdate', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 15000,
      });

      return await parseAPIResponse<LeadCreateResponse>(response, 'Lead CreateOrUpdate');
    } catch (error: any) {
      return {
        IsSuccess: false,
        ErrorMessage: error.message || 'Failed to create lead',
      };
    }
  },

  async getCustomerSources(token: string): Promise<CustomerSource[]> {
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const response = await fetch(`${API_BASE_URL}/api/Lead/CustomerSources`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Customer sources API failed with status ${response.status}`);
    }

    return (await response.json()) as CustomerSource[];
  },

  async getLeadTags(token: string): Promise<LeadTag[]> {
    if (!token) {
      throw new Error('No authentication token provided');
    }

    const response = await fetch(`${API_BASE_URL}/api/Lead/Tags`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`Lead tags API failed with status ${response.status}`);
    }

    const data = (await response.json()) as LeadTag[];
    // Filter for category 8 tags per MaidCentral API convention.
    return data.filter((tag) => tag.CategoryId === 8);
  },

  async createOrUpdateQuote(token: string, data: QuoteCreateRequest): Promise<QuoteCreateResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const requestData: QuoteCreateRequest = {
        SendQuoteEmail: false,
        AddToCampaigns: true,
        TriggerWebhook: true,
        ...data,
      };

      const response = await fetchMaidCentralAPI('/api/Lead/CreateOrUpdateQuote', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 30000,
        retries: 0,
      });

      return await parseAPIResponse<QuoteCreateResponse>(response, 'Quote CreateOrUpdate');
    } catch (error: any) {
      return {
        IsSuccess: false,
        ErrorMessage: error.message || 'Failed to create quote',
      };
    }
  },
};
