import type { BookQuoteRequest, BookQuoteResponse } from '@/app/types/api/bookquote';
import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';

/**
 * BookQuote API Service
 * Handles booking confirmation with MaidCentral API
 */
export const bookQuoteService = {
  /**
   * Book a quote for a lead
   * @param token Authentication token
   * @param data BookQuote request data
   * @returns Promise with booking response
   */
  async bookQuote(token: string, data: BookQuoteRequest): Promise<BookQuoteResponse> {

    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      // Default values for optional fields
      const requestData: BookQuoteRequest = {
        SendBookedEmail: false,
        SendCustomerPortalInvite: false,
        TriggerWebhook: false,
        ...data
      };

      // Prepare request data with defaults

      console.time('🌐 BookQuote API call');
      const apiStart = performance.now();

      const response = await fetchMaidCentralAPI('/api/Lead/BookQuote', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 30000, // Increased to 30 second timeout for consistency
        retries: 0 // No retries to avoid confusion
      });

      const responseData = await parseAPIResponse(response, 'BookQuote');

      // Add success flag for consistency
      return {
        success: true,
        ...responseData
      };

    } catch (error: any) {

      // Return error response
      return {
        success: false,
        error: error.message || 'Failed to book quote'
      };
    }
  }
}