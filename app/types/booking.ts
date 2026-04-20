import type { ScopeGroup, Scope, Frequency, PostalCodeResult } from '@/app/services/api/booking-data';

export interface BookingStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'service' | 'extra' | 'fee' | 'discount' | 'tax';
}

export interface BookingPricing {
  lineItems: LineItem[];
  subtotal: number;
  discounts: number;
  fees: number;
  taxes: number;
  total: number;
  // Pre-adjustment CalculatedBaseCost from the API. Sent as BaseFee on BookQuote so
  // the server re-applies rate modifications without double-counting.
  baseFee: number;
}

export interface BookingFormData {
  // Service selection (driven by ScopeGroups API)
  selectedScopeGroup?: ScopeGroup;
  selectedScope?: Scope;
  selectedFrequency?: Frequency;

  // Location & schedule
  zipCode: string;
  validatedPostalCode?: PostalCodeResult;
  selectedDate?: Date;
  selectedTime?: string;

  // Customer details
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    specialInstructions?: string;
  };

  // Payment
  payment: {
    method: 'card' | 'paypal' | 'bank';
    billingAddress?: {
      sameAsService: boolean;
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    paymentToken?: string;
    paymentExpiry?: string;
  };

  // Backend booking identifiers (populated after lead / quote creation)
  leadId?: number;
  quoteId?: string;
  scopeGroupId?: number;

  // Pricing snapshot from the most recent CalculatePrice call
  pricing: BookingPricing;
}

export interface BookingContextType {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: BookingStep[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isPricingLoading: boolean;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  calculatePricing: () => void;
  calculatePricingAsync: (
    authToken: string,
    currentState?: {
      selectedModifications?: Record<number, number>;
      questionAnswers?: Record<number, string>;
      rateModifications?: unknown[];
    }
  ) => Promise<void>;
}
