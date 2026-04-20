import type { BookQuoteRequest, BookQuoteResponse } from '@/app/types/api/bookquote';
import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';

/**
 * Confirms a booking against `POST /api/Lead/BookQuote`. Payment processing happens
 * server-side at this step, so the request can take substantially longer than other
 * API calls — hence the extended 2 minute timeout.
 */
export const bookQuoteService = {
  async bookQuote(token: string, data: BookQuoteRequest): Promise<BookQuoteResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const requestData: BookQuoteRequest = {
        ...data,
        SendBookedEmail: data.SendBookedEmail ?? false,
        SendCustomerPortalInvite: data.SendCustomerPortalInvite ?? false,
        TriggerWebhook: data.TriggerWebhook ?? false,
      };

      const response = await fetchMaidCentralAPI('/api/Lead/BookQuote', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 120000,
        retries: 0,
      });

      const responseData = await parseAPIResponse<BookQuoteResponse>(response, 'BookQuote');

      return {
        ...responseData,
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to book quote',
      };
    }
  },
};
