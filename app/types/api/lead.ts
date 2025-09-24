export interface LeadCreateRequest {
  SendLeadEmail?: boolean
  AddToCampaigns?: boolean
  TriggerWebhook?: boolean
  AllowDuplicates?: boolean
  LeadId?: number
  FirstName: string
  LastName: string
  Email: string
  Phone: string
  PostalCode: string
  RedirectUrl?: string
  Notes?: string
  CustomerSourceId?: number
  LeadTagIds?: number[]
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  // Additional fields based on API response
  ScopeGroupId?: number
  HomeAddress1?: string
  HomeAddress2?: string
  HomeCity?: string
  HomeRegion?: string
  HomePostalCode?: string
  BillingAddress1?: string
  BillingAddress2?: string
  BillingCity?: string
  BillingRegion?: string
  BillingPostalCode?: string
}

export interface LeadResult {
  LeadId: number
  FirstName: string
  LastName: string
  Email: string
  Phone: string
  PostalCode?: string
  StatusId?: number
  StatusName?: string
  // Add other fields as needed
}

export interface LeadCreateResponse {
  IsSuccess: boolean
  Result?: LeadResult
  LeadId?: number  // Some responses might have direct LeadId
  Message?: string
  InnerException?: string | null
  StatusCode?: number
  RedirectUrl?: string
  ErrorMessage?: string
}

export interface CustomerSource {
  CustomerSourceId: number
  Name: string
}

export interface LeadTag {
  TagId: number
  Name: string
  CategoryId: number
}

// Quote creation interfaces
export interface QuoteRateModification {
  Quantity: number
  RateModificationId: number
  IsRecurring?: boolean
}

export interface QuoteScopeOfWork {
  ScopeOfWorkId: number
  FrequencyId: string
  BaseFee?: number
  RateModifications?: QuoteRateModification[]
}

export interface QuoteQuestion {
  QuestionId: number
  Answer: string
}

export interface QuoteCreateRequest {
  LeadId: number
  QuoteId?: string
  HomeAddress1: string
  HomeAddress2?: string
  HomeCity: string
  HomeRegion: string
  HomePostalCode: string
  BillingAddress1?: string
  BillingAddress2?: string
  BillingCity?: string
  BillingRegion?: string
  BillingPostalCode?: string
  SendQuoteEmail?: boolean
  AddToCampaigns?: boolean
  TriggerWebhook?: boolean
  ScopeGroupId: number
  ScopesOfWork: QuoteScopeOfWork[]
  Questions: QuoteQuestion[]
  // Payment tokenization fields
  PaymentToken?: string
  PaymentExpiry?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export interface QuoteResult {
  QuoteId: string
  LeadId: number
  BookNowUrl?: string
  StatusId?: number
  StatusName?: string
  ScopeGroupId?: number
  ScopeGroupName?: string
  // Add other fields as needed
}

export interface QuoteCreateResponse {
  IsSuccess: boolean
  Result?: QuoteResult
  QuoteId?: string  // Some responses might have direct QuoteId
  Message?: string
  InnerException?: string | null
  StatusCode?: number
  ErrorMessage?: string
}