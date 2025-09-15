// Export main API service
export { MaidCentralApiService, maidCentralApi } from './maidcentral';

// Export HTTP client
export { HttpClient, httpClient } from './http-client';
export type { HttpClientConfig } from './http-client';

// Export cache manager
export { CacheManager, cacheManager } from './cache-manager';

// Re-export types for convenience
export type {
  ScopeGroup,
  Scope,
  Question,
  QuestionOption,
  ValidationRule,
  ConditionalLogic,
  RateModification,
  PostalCode,
  AvailabilitySlot,
  PriceCalculationRequest,
  PriceCalculationResponse,
  PriceBreakdown,
  BillingTerm,
  Lead,
  Address,
  Quote,
  BookQuoteRequest,
  BookQuoteResponse,
  AvailabilityRequest,
  ApiError,
  ApiResponse
} from '@/app/types/api';