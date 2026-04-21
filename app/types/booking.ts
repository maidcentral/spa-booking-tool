import type {
  ScopeGroup,
  Scope,
  Frequency,
  PostalCodeResult,
  RateModification,
} from '@/app/services/api/booking-data';

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
  // the server re-applies rate modifications without double-counting. In a
  // multi-scope booking, this is the sum across scopes — but consumers should
  // prefer `perScope[scopeId].baseFee` when constructing the BookQuote payload.
  baseFee: number;
  // Total hours (recurring when available, first-job otherwise), summed across
  // all selected scopes. The Availability endpoint needs this to compute
  // per-day capacity for hours-based scope groups.
  totalHours: number;
  // MaidCentral's built-in form splits the summary into "first job" and
  // "recurring" totals; many scopes price those differently.
  firstJobTotal: number;
  recurringTotal: number;
  // Per-scope breakdown, keyed by ScopeId. Populated when the backing
  // CalculatePrice response contains multiple scopes; the Step 3 booking call
  // reads `baseFee` from each entry as the `BaseFee` on its `ScopesOfWork` line.
  perScope: Record<number, PerScopePricing>;
}

export interface PerScopePricing {
  scopeId: number;
  scopeName: string;
  frequencyId: string;
  frequencyName: string;
  baseFee: number;               // pre-adjustment (CalculatedBaseCost)
  adjustedBaseCost: number;      // post-adjustment — what the customer sees
  totalFirstJobCost: number;
  totalRecurringCost: number;
  totalHours: number;
}

export interface BookingFormData {
  // Service selection (driven by ScopeGroups API)
  selectedScopeGroup?: ScopeGroup;
  // `selectedScope` and `selectedFrequency` are the legacy single-scope fields
  // — still populated (mirrored from the first entry of `selectedScopes`) for
  // consumers like the sidebar badge and the single-page flow that haven't
  // migrated to multi-scope yet. New code should read `selectedScopes`.
  selectedScope?: Scope;
  selectedFrequency?: Frequency;
  // Multi-scope selection used by the multi-step flow — matches MaidCentral's
  // built-in form which lets a visitor pick several scopes within one group.
  selectedScopes: Scope[];

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

  // Optional "How did you hear about us?" selection. Forwarded as CustomerSourceId
  // on the CreateOrUpdate lead call.
  customerSourceId?: number;

  // UTM attribution parsed from window.location.search on mount. Forwarded on
  // every lead/quote/book call so MaidCentral persists it against the quote.
  utm: UtmParams;

  // TCPA consent collected on Step 1. No Lead API fields accept these today
  // (see docs/online-booking-form/03-gap-analysis.md §5), so these values stay
  // client-side until the API is extended or a token-broker audit log exists.
  smsConsentTransactional: boolean;
  smsConsentMarketing: boolean;

  // Pricing snapshot from the most recent CalculatePrice call
  pricing: BookingPricing;
}

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
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
      rateModifications?: RateModification[];
      frequencyByScope?: Record<number, Frequency>;
      modsByScope?: Record<number, Record<number, number>>;
    }
  ) => Promise<void>;
}
