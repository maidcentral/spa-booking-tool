import type { BookQuoteRequest, BookQuoteResponse } from '@/app/types/api/bookquote';
import { fetchMaidCentralAPI, parseAPIResponse } from './fetch-utils';

/**
 * Envelope returned by POST /api/Lead/BookQuote. MaidCentral wraps every Lead
 * API result in `{ IsSuccess, Message, Result, InnerException, StatusCode }`
 * — we honour IsSuccess here because a logical failure (quote already booked,
 * payment token rejected) can come back with HTTP 200 and IsSuccess=false.
 */
interface BookQuoteEnvelope {
  IsSuccess?: boolean;
  Message?: string | null;
  ErrorMessage?: string | null;
  Result?: {
    CustomerInformationId?: number | string;
    CustomerQuoteDetailGroupId?: string;
  } | null;
  StatusCode?: number;
  InnerException?: string | null;
}

/**
 * Confirms a booking against `POST /api/Lead/BookQuote`. Payment processing
 * happens server-side at this step, so the request can take substantially
 * longer than other API calls — hence the extended 2 minute timeout.
 */
export const bookQuoteService = {
  async bookQuote(token: string, data: BookQuoteRequest): Promise<BookQuoteResponse> {
    try {
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const requestData: BookQuoteRequest = {
        ...data,
        // Defaults match the built-in MaidCentral booking form: confirmation email
        // and Partner webhook fire by default; customer portal invite is off
        // because the portal flow is out of scope for the Partner rebuild.
        SendBookedEmail: data.SendBookedEmail ?? true,
        SendCustomerPortalInvite: data.SendCustomerPortalInvite ?? false,
        TriggerWebhook: data.TriggerWebhook ?? true,
      };

      const response = await fetchMaidCentralAPI('/api/Lead/BookQuote', token, {
        method: 'POST',
        body: JSON.stringify(requestData),
        timeout: 120000,
        retries: 0,
      });

      const envelope = await parseAPIResponse<BookQuoteEnvelope>(response, 'BookQuote');

      // HTTP 200 with IsSuccess=false is the standard .NET pattern for
      // business-logic rejections. Treat as a booking failure so callers show
      // the API's message rather than a spurious success.
      if (envelope && envelope.IsSuccess === false) {
        return {
          success: false,
          error:
            envelope.Message ||
            envelope.ErrorMessage ||
            envelope.InnerException ||
            'Booking failed',
          message: envelope.Message ?? undefined,
        };
      }

      return {
        success: true,
        message: envelope?.Message ?? undefined,
        bookingId:
          typeof envelope?.Result?.CustomerQuoteDetailGroupId === 'string'
            ? envelope.Result.CustomerQuoteDetailGroupId
            : undefined,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to book quote';
      return {
        success: false,
        error: message,
      };
    }
  },
};
