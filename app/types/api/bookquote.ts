export interface RateModification {
  RateModificationId: number;
  Quantity: number;
  IsRecurring: boolean;
}

export interface ScopeOfWork {
  ScopeOfWorkId: number;
  FrequencyId: string;
  FirstJobDate: string;
  BaseFee: number;
  RateModifications?: RateModification[];
  FirstJobTags?: number[];
  FirstJobInstructions?: string;
  ServiceSetTagIds?: number[];
  TeamIds?: number[];
}

export interface BookQuoteRequest {
  SendBookedEmail: boolean;
  SendCustomerPortalInvite: boolean;
  TriggerWebhook: boolean;
  LeadId: number;
  QuoteId: string;
  Expiry: string;
  Token: string;
  ScopeGroupId: number;
  ScopesOfWork: ScopeOfWork[];
  // MaidCentral billing-terms row id. 2 = credit card, which is the only
  // payment path we support today (CardConnect tokenized card). Optional in
  // the wire format; we always set it explicitly so the server doesn't fall
  // back to an unexpected default on tenants that have reconfigured their
  // billing terms table.
  BillingTermsId?: number;

  // Required Home/Service Address Fields
  HomeAddress1: string;
  HomeCity: string;
  HomeRegion: string;
  HomePostalCode: string;

  // Required Billing Address Fields
  CustomerBillingAddress1: string;
  CustomerBillingCity: string;
  CustomerBillingRegion: string;

  // Optional Address Fields
  HomeAddress2?: string;
  CustomerBillingAddress2?: string;
  CustomerBillingPostalCode?: string;

  // Attribution (persisted against the quote by the API)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface BookQuoteResponse {
  success: boolean;
  message?: string;
  bookingId?: string;
  error?: string;
}