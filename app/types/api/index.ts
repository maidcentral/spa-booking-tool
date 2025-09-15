// MaidCentral API Types
// Based on the external API specification for dynamic form integration

// Re-export authentication types
export * from './auth';

export interface ScopeGroup {
  id: string;
  name: string;
  description?: string;
  industryId?: string;
  isActive: boolean;
}

export interface Scope {
  id: string;
  scopeGroupId: string;
  name: string;
  description?: string;
  basePrice?: number;
  isActive: boolean;
}

export interface Question {
  id: string;
  scopeId: string;
  questionText: string;
  questionType: 'text' | 'select' | 'number' | 'multiselect' | 'boolean';
  isRequired: boolean;
  options?: QuestionOption[];
  validationRules?: ValidationRule[];
  order: number;
  conditionalLogic?: ConditionalLogic;
}

export interface QuestionOption {
  id: string;
  value: string;
  label: string;
  priceModifier?: number;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: string | number;
  message: string;
}

export interface ConditionalLogic {
  dependsOn: string; // Question ID
  condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  value: any;
}

export interface RateModification {
  id: string;
  scopeId: string;
  name: string;
  description?: string;
  priceModifier: number;
  modificationType: 'percentage' | 'fixed';
  category?: string;
}

export interface PostalCode {
  code: string;
  city: string;
  state: string;
  country: string;
  isServiceable: boolean;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  providerId?: string;
}

export interface PriceCalculationRequest {
  scopeId: string;
  answers: Record<string, any>;
  rateModificationIds?: string[];
  postalCode?: string;
  serviceDate?: string;
}

export interface PriceCalculationResponse {
  basePrice: number;
  modifiersTotal: number;
  subtotal: number;
  tax: number;
  total: number;
  breakdown: PriceBreakdown[];
}

export interface PriceBreakdown {
  description: string;
  amount: number;
  type: 'base' | 'modifier' | 'tax';
}

export interface BillingTerm {
  id: string;
  name: string;
  description?: string;
  paymentSchedule: 'immediate' | 'net30' | 'net60' | 'custom';
}

export interface Lead {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
  preferredContactMethod?: 'email' | 'phone' | 'sms';
}

export interface LeadCreateRequest {
  SendLeadEmail?: boolean;
  TriggerWebhook?: boolean;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  PostalCode: string;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Quote {
  id?: string;
  leadId: string;
  scopeId: string;
  serviceDate: string;
  serviceTime: string;
  answers: Record<string, any>;
  rateModificationIds: string[];
  pricing: PriceCalculationResponse;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  expiresAt?: string;
}

export interface BookQuoteRequest {
  quoteId: string;
  billingTermId: string;
  paymentMethodId?: string;
  notes?: string;
}

export interface BookQuoteResponse {
  bookingId: string;
  confirmationNumber: string;
  status: 'confirmed' | 'pending' | 'failed';
  message?: string;
}

export interface AvailabilityRequest {
  scopeGroupId: string;
  hours: number;
  startDate?: string;
  endDate?: string;
  postalCode?: string;
}

// API Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
}