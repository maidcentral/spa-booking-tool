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
    console.time('bookQuote');
    console.log('🚀 Booking Quote...');
    console.log('📦 Book request data size:', JSON.stringify(data).length, 'bytes');
    console.log('🔐 Token length:', token?.length || 0, 'chars');

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

      console.log('📋 Final request data:', JSON.stringify(requestData, null, 2));

      console.time('🌐 BookQuote API call');
      const apiStart = performance.now();

      const response = await fetchMaidCentralAPI('/api/Lead/BookQuote', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 30000, // Increased to 30 second timeout for consistency
        retries: 0 // No retries to avoid confusion
      });

      const apiEnd = performance.now();
      console.timeEnd('🌐 BookQuote API call');
      console.log(`📊 BookQuote API took: ${(apiEnd - apiStart).toFixed(2)}ms`);
      console.log('📬 BookQuote API response status:', response.status);

      console.time('🔍 Response parsing');
      const responseData = await parseAPIResponse(response, 'BookQuote');
      console.timeEnd('🔍 Response parsing');

      console.timeEnd('bookQuote');
      console.log('✅ BookQuote API success:', responseData);

      // Add success flag for consistency
      return {
        success: true,
        ...responseData
      };

    } catch (error: any) {
      console.error('❌ BookQuote failed:', error.message);

      // Return error response
      return {
        success: false,
        error: error.message || 'Failed to book quote'
      };
    }
  }
}