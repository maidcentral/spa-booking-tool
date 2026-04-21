"use client"

import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react"
import { BookingFormData, BookingContextType, BookingStep, BookingPricing, LineItem } from "@/app/types/booking"
import {
  bookingDataService,
  PriceCalculationRequest,
  PriceCalculationResponse,
  QuestionData,
  Question,
  ScopeOfWork,
  RateModification,
  Frequency,
} from "@/app/services/api/booking-data"

const initialBookingData: BookingFormData = {
  zipCode: "",
  customer: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    },
  },
  payment: {
    method: "card",
    billingAddress: {
      sameAsService: true,
    },
  },
  selectedScopes: [],
  utm: {},
  smsConsentTransactional: false,
  smsConsentMarketing: false,
  pricing: {
    lineItems: [],
    subtotal: 0,
    discounts: 0,
    fees: 0,
    taxes: 0,
    total: 0,
    baseFee: 0,
    totalHours: 0,
    firstJobTotal: 0,
    recurringTotal: 0,
    perScope: {},
  },
}

// Booking steps
const bookingSteps: BookingStep[] = [
  {
    id: "service-selection",
    title: "Service Selection",
    description: "Choose your service",
    isCompleted: false,
    isActive: true,
  },
  {
    id: "customization",
    title: "Customization",
    description: "Extras and preferences",
    isCompleted: false,
    isActive: false,
  },
  {
    id: "location-schedule",
    title: "Location & Schedule",
    description: "When and where",
    isCompleted: false,
    isActive: false,
  },
  {
    id: "customer-details",
    title: "Customer Details",
    description: "Contact and payment",
    isCompleted: false,
    isActive: false,
  },
]

// Booking action types
type BookingAction =
  | { type: "UPDATE_FORM_DATA"; payload: Partial<BookingFormData> }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERRORS"; payload: Record<string, string> }
  | { type: "CALCULATE_PRICING" }
  | { type: "SET_PRICING"; payload: BookingPricing }
  | { type: "SET_PRICING_LOADING"; payload: boolean }
  | { type: "RESET_FORM" }

// Booking state
interface BookingState {
  formData: BookingFormData
  currentStep: number
  steps: BookingStep[]
  isLoading: boolean
  isPricingLoading: boolean
  errors: Record<string, string>
}

const initialState: BookingState = {
  formData: initialBookingData,
  currentStep: 0,
  steps: bookingSteps,
  isLoading: false,
  isPricingLoading: false,
  errors: {},
}

// Helper function to auto-generate answers for required questions
const generateAutoAnswers = (questions: QuestionData[]): Question[] => {
  return questions
    .filter(q => q.IsRequired) // Only answer required questions
    .map(q => {
      // Try to find a neutral or common answer, otherwise use first answer
      let selectedAnswer = q.Answers[0]; // Default to first answer
      
      // Look for common neutral answers
      const neutralAnswers = ['Other', 'Google', 'Internet - Search', 'Used our Services Before'];
      for (const neutralText of neutralAnswers) {
        const neutralAnswer = q.Answers.find(a => a.AnswerText.includes(neutralText));
        if (neutralAnswer) {
          selectedAnswer = neutralAnswer;
          break;
        }
      }
      
      return {
        QuestionId: q.QuestionId,
        Answer: selectedAnswer?.AnswerId?.toString() || "0"
      };
    });
};

// Build a rate-mod request entry for one scope.
const buildRateModsForScope = (
  selectedMods: Record<number, number> | undefined,
  rateModifications: RateModification[],
  isFrequencyRecurring: boolean
) => {
  return Object.entries(selectedMods ?? {})
    .filter(([, quantity]) => quantity > 0)
    .map(([modId, quantity]) => {
      const modIdInt = parseInt(modId);
      const rateMod = rateModifications.find(rm => rm.RateModificationId === modIdInt);
      const modRequest: {
        Quantity: number;
        RateModificationId: number;
        IsRecurring?: boolean;
        RateModificationFrequencyId?: number;
      } = {
        Quantity: quantity,
        RateModificationId: modIdInt,
      };
      if (isFrequencyRecurring && rateMod?.IsRecurring === true) {
        modRequest.IsRecurring = true;
      }
      if (!modRequest.IsRecurring && rateMod?.RateModificationFrequencyId) {
        modRequest.RateModificationFrequencyId = rateMod.RateModificationFrequencyId;
      }
      return modRequest;
    });
};

// Build the multi-scope CalculatePrice request. Falls back to the legacy
// single-scope fields when the caller hasn't migrated to the `*ByScope` records
// yet — keeps the single-page flow working through the transition.
const buildPriceCalculationRequest = (
  formData: BookingFormData,
  questions: Question[] = [],
  selectedModifications: Record<number, number> = {},
  rateModifications: RateModification[] = [],
  currentState?: {
    frequencyByScope?: Record<number, Frequency>
    modsByScope?: Record<number, Record<number, number>>
  }
): PriceCalculationRequest => {
  const scopes = formData.selectedScopes?.length
    ? formData.selectedScopes
    : formData.selectedScope
    ? [formData.selectedScope]
    : [];

  const frequencyByScope = currentState?.frequencyByScope;
  const modsByScope = currentState?.modsByScope;

  const scopesOfWork = scopes.map(scope => {
    const freq =
      frequencyByScope?.[scope.ScopeId] ??
      (formData.selectedScope?.ScopeId === scope.ScopeId ? formData.selectedFrequency : undefined);
    const mods = modsByScope?.[scope.ScopeId] ?? selectedModifications;
    const isFrequencyRecurring = freq?.FrequencyId !== undefined && freq?.FrequencyId !== 'S';
    const rateMods = buildRateModsForScope(mods, rateModifications, isFrequencyRecurring);
    const entry: ScopeOfWork = {
      ScopeOfWorkId: scope.ScopeId,
      FrequencyId: freq?.FrequencyId || '',
    };
    if (rateMods.length > 0) {
      entry.RateModifications = rateMods;
    }
    return entry;
  });

  return {
    ScopeGroupId: formData.selectedScopeGroup?.ScopeGroupId || 0,
    ScopesOfWork: scopesOfWork,
    Questions: questions,
  };
};

// Process a multi-scope CalculatePrice response into a BookingPricing record.
// The API returns one entry per scope in Result[], each with its own Frequencies
// array — we take the first frequency (the one the visitor selected for that
// scope) and aggregate across scopes.
const processApiResponseToLineItems = (response: PriceCalculationResponse): BookingPricing => {
  if (!response.Result || response.Result.length === 0) {
    throw new Error('No pricing results in API response');
  }

  const lineItems: LineItem[] = [];
  const perScope: Record<number, import('@/app/types/booking').PerScopePricing> = {};
  let subtotal = 0;
  let baseFeeTotal = 0;
  let totalHours = 0;
  let firstJobTotal = 0;
  let recurringTotal = 0;

  for (const result of response.Result) {
    if (!result.Frequencies || result.Frequencies.length === 0) continue;
    const frequency = result.Frequencies[0];

    // AdjustedBaseCost is the post-modification price the customer sees.
    // CalculatedBaseCost is the pre-modification value sent as BaseFee on BookQuote.
    const adjustedCost = frequency.AdjustedBaseCost ?? frequency.CalculatedBaseCost ?? 0;
    const baseFee = frequency.CalculatedBaseCost ?? 0;
    const hours =
      frequency.TotalRecurringHours ||
      frequency.TotalFirstJobHours ||
      frequency.TotalBaseHours ||
      0;

    subtotal += adjustedCost;
    baseFeeTotal += baseFee;
    totalHours += hours;
    firstJobTotal += frequency.TotalFirstJobCost ?? 0;
    recurringTotal += frequency.TotalRecurringCost ?? 0;

    lineItems.push({
      id: `scope-${result.ScopeOfWorkId}`,
      name: result.ScopeName || 'Service',
      description: frequency.FrequencyName,
      quantity: 1,
      unitPrice: adjustedCost,
      totalPrice: adjustedCost,
      type: 'service',
    });

    perScope[result.ScopeOfWorkId] = {
      scopeId: result.ScopeOfWorkId,
      scopeName: result.ScopeName || 'Service',
      frequencyId: frequency.FrequencyId,
      frequencyName: frequency.FrequencyName,
      baseFee,
      adjustedBaseCost: adjustedCost,
      totalFirstJobCost: frequency.TotalFirstJobCost ?? 0,
      totalRecurringCost: frequency.TotalRecurringCost ?? 0,
      totalHours: hours,
    };
  }

  return {
    lineItems,
    subtotal,
    discounts: 0,
    fees: 0,
    taxes: 0,
    total: subtotal,
    baseFee: baseFeeTotal,
    totalHours,
    firstJobTotal,
    recurringTotal,
    perScope,
  };
};

// Fallback pricing calculation (when API is not available)
const calculateFallbackPricing = (formData: BookingFormData): BookingPricing => {
  // Return empty pricing - real pricing comes from API
  return {
    lineItems: [],
    subtotal: 0,
    discounts: 0,
    fees: 0,
    taxes: 0,
    total: 0,
    baseFee: 0,
    totalHours: 0,
    firstJobTotal: 0,
    recurringTotal: 0,
    perScope: {},
  }
}

// Booking reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "UPDATE_FORM_DATA": {
      const newFormData = { ...state.formData, ...action.payload }
      // Don't calculate pricing here - it will be handled async
      
      return {
        ...state,
        formData: newFormData,
        errors: {}, // Clear errors when form data updates
      }
    }
    
    case "SET_CURRENT_STEP": {
      const newSteps = state.steps.map((step, index) => ({
        ...step,
        isActive: index === action.payload,
        isCompleted: index < action.payload,
      }))
      
      return {
        ...state,
        currentStep: action.payload,
        steps: newSteps,
      }
    }
    
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    
    case "SET_ERRORS":
      return {
        ...state,
        errors: action.payload,
      }
    
    case "CALCULATE_PRICING": {
      const newPricing = calculateFallbackPricing(state.formData)
      return {
        ...state,
        formData: {
          ...state.formData,
          pricing: newPricing,
        },
      }
    }

    case "SET_PRICING":
      return {
        ...state,
        formData: {
          ...state.formData,
          pricing: action.payload,
        },
        isPricingLoading: false,
      }

    case "SET_PRICING_LOADING":
      return {
        ...state,
        isPricingLoading: action.payload,
      }
    
    case "RESET_FORM":
      return initialState
    
    default:
      return state
  }
}

// Booking context
const BookingContext = createContext<BookingContextType | undefined>(undefined)

// Booking provider
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)

  const updateFormData = useCallback((data: Partial<BookingFormData>) => {
    dispatch({ type: "UPDATE_FORM_DATA", payload: data })
  }, [])

  const setCurrentStep = useCallback((step: number) => {
    dispatch({ type: "SET_CURRENT_STEP", payload: step })
  }, [])

  const setIsLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading })
  }, [])

  const setErrors = useCallback((errors: Record<string, string>) => {
    dispatch({ type: "SET_ERRORS", payload: errors })
  }, [])

  const calculatePricingCallback = useCallback(() => {
    dispatch({ type: "CALCULATE_PRICING" })
  }, [])

  const calculatePricingAsync = useCallback(async (authToken: string, currentState?: {
    selectedModifications?: Record<number, number>
    questionAnswers?: Record<number, string>
    rateModifications?: RateModification[]
    // New multi-scope inputs. When present, these take precedence over the
    // legacy single-scope fields; the request builder iterates `selectedScopes`
    // and pairs each with its frequency + mods.
    frequencyByScope?: Record<number, Frequency>
    modsByScope?: Record<number, Record<number, number>>
  }) => {
    // Get fresh state data
    const currentFormData = state.formData;

    // Multi-scope readiness: every selected scope must have a frequency.
    const multiScopes = currentFormData.selectedScopes ?? [];
    const multiReady =
      multiScopes.length > 0 &&
      !!currentFormData.selectedScopeGroup &&
      multiScopes.every(s => !!currentState?.frequencyByScope?.[s.ScopeId]);
    // Legacy single-scope fallback for the single-page flow that hasn't migrated.
    const singleReady =
      !!currentFormData.selectedScopeGroup &&
      !!currentFormData.selectedScope &&
      !!currentFormData.selectedFrequency;
    if (!multiReady && !singleReady) {
      return;
    }

    try {
      dispatch({ type: "SET_PRICING_LOADING", payload: true });

      // Step 1: Try to fetch questions and use real user answers if available.
      // In multi-scope mode fetch questions for every selected scope.
      let questionsForPricing: Question[] = [];
      try {
        const scopeIds = multiReady
          ? multiScopes.map(s => s.ScopeId)
          : currentFormData.selectedScope
          ? [currentFormData.selectedScope.ScopeId]
          : [];
        if (scopeIds.length > 0) {
          const questionsResponse = await bookingDataService.getQuestions(authToken, scopeIds);
          if (questionsResponse.IsSuccess !== false && questionsResponse.Result) {
            if (currentState?.questionAnswers) {
              questionsForPricing = questionsResponse.Result
                .filter(q => currentState.questionAnswers![q.QuestionId])
                .map(q => ({
                  QuestionId: q.QuestionId,
                  Answer: currentState.questionAnswers![q.QuestionId]
                }));
            } else {
              questionsForPricing = generateAutoAnswers(questionsResponse.Result);
            }
          }
        }
      } catch {
        // Non-fatal — the API will just return "missing required questions" if
        // any server-side defaults aren't configured, and the UI surfaces it.
      }

      // Step 2: Build pricing request with current data and actual selections
      const request = buildPriceCalculationRequest(
        currentFormData,
        questionsForPricing,
        currentState?.selectedModifications || {},
        currentState?.rateModifications || [],
        {
          frequencyByScope: currentState?.frequencyByScope,
          modsByScope: currentState?.modsByScope,
        }
      );
      
      // Step 3: Call pricing API
      const response = await bookingDataService.calculatePrice(authToken, request);
      
      // Validate API response structure
      if (!response || !response.Result || response.Result.length === 0) {
        throw new Error('Invalid API response: No results returned');
      }
      
      if (!response.Result[0].Frequencies || response.Result[0].Frequencies.length === 0) {
        throw new Error('Invalid API response: No frequency data returned');
      }
      
      try {
        const pricing = processApiResponseToLineItems(response);
        dispatch({ type: "SET_PRICING", payload: pricing });
        // Non-blocking: surface the recalculated totals to partner analytics.
        // The Partner configures window.mcBookingTrack to consume these.
        if (typeof window !== "undefined" && window.mcBookingTrack) {
          try {
            window.mcBookingTrack({
              type: "booking_price_recalculated",
              firstJobTotal: pricing.firstJobTotal,
              recurringTotal: pricing.recurringTotal,
              totalHours: pricing.totalHours,
            });
          } catch {
            /* swallow partner analytics errors */
          }
        }
      } catch (processingError) {
        throw processingError;
      }
      
    } catch (error) {
      // Fall back to empty pricing
      dispatch({ type: "SET_PRICING", payload: calculateFallbackPricing(currentFormData) });
    } finally {
      dispatch({ type: "SET_PRICING_LOADING", payload: false });
    }
  }, [state.formData]) // Add dependency on formData to get fresh data

  const contextValue: BookingContextType = useMemo(() => ({
    formData: state.formData,
    updateFormData,
    currentStep: state.currentStep,
    setCurrentStep,
    steps: state.steps,
    isLoading: state.isLoading,
    setIsLoading,
    isPricingLoading: state.isPricingLoading,
    errors: state.errors,
    setErrors,
    calculatePricing: calculatePricingCallback,
    calculatePricingAsync,
  }), [state.formData, updateFormData, state.currentStep, setCurrentStep, state.steps, state.isLoading, setIsLoading, state.isPricingLoading, state.errors, setErrors, calculatePricingCallback, calculatePricingAsync])

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  )
}

// Hook to use booking context
export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider")
  }
  return context
}