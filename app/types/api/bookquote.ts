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
}

export interface BookQuoteResponse {
  success: boolean;
  message?: string;
  bookingId?: string;
  error?: string;
}