"use client"

import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react"
import { BookingFormData, BookingContextType, BookingStep, BookingPricing, LineItem } from "@/app/types/booking"
import { mockFrequencyOptions } from "@/app/lib/mockData"
import { bookingDataService, PriceCalculationRequest, PriceCalculationResponse, PriceCalculationResult, QuestionData, Question } from "@/app/services/api/booking-data"

// Initial booking data
const initialBookingData: BookingFormData = {
  pricingParameters: {},
  zipCode: "",
  selectedExtras: [],
  frequency: mockFrequencyOptions[0], // One-time as default
  customFields: {},
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
  pricing: {
    lineItems: [],
    subtotal: 0,
    discounts: 0,
    fees: 0,
    taxes: 0,
    total: 0,
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

// Helper function to build price calculation request
const buildPriceCalculationRequest = (
  formData: BookingFormData, 
  questions: Question[] = [],
  selectedModifications: Record<number, number> = {},
  rateModifications: any[] = []
): PriceCalculationRequest => {

  // Build rate modifications array from selected modifications

  const rateModsArray = Object.entries(selectedModifications)
    .filter(([_, quantity]) => quantity > 0)
    .map(([modId, quantity]) => {
      const modIdInt = parseInt(modId);
      const rateMod = rateModifications.find(rm => rm.RateModificationId === modIdInt);

      // Find the rate modification details

      // Build the rate modification object according to API spec
      const modRequest: any = {
        Quantity: quantity,
        RateModificationId: modIdInt
      };
      
      // Add IsRecurring if the modification is recurring
      // Only set IsRecurring to true if:
      // 1. The selected frequency is recurring (not 'S')
      // 2. The rate modification supports recurring (IsRecurring is true)
      const isFrequencyRecurring = formData.selectedFrequency?.FrequencyId !== 'S';
      const isModificationRecurring = rateMod?.IsRecurring === true;
      
      if (isFrequencyRecurring && isModificationRecurring) {
        modRequest.IsRecurring = true;
      }
      
      // Add RateModificationFrequencyId if provided and not recurring
      if (!modRequest.IsRecurring && rateMod?.RateModificationFrequencyId) {
        modRequest.RateModificationFrequencyId = rateMod.RateModificationFrequencyId;
      }
      
      return modRequest;
    });
  
  
  // Build the request according to the exact API specification
  const request: PriceCalculationRequest = {
    ScopeGroupId: formData.selectedScopeGroup?.ScopeGroupId || 0,
    ScopesOfWork: [
      {
        ScopeOfWorkId: formData.selectedScope?.ScopeId || 0,
        FrequencyId: formData.selectedFrequency?.FrequencyId || ""
      }
    ],
    Questions: questions
  };
  
  // Only add RateModifications if there are any
  if (rateModsArray.length > 0) {
    request.ScopesOfWork[0].RateModifications = rateModsArray;
  }

  // Return the complete pricing request

  return request;
};

// Helper function to process API response into LineItems
const processApiResponseToLineItems = (response: PriceCalculationResponse): BookingPricing => {
  if (!response.Result || response.Result.length === 0) {
    throw new Error('No pricing results in API response');
  }

  const result = response.Result[0];
  if (!result.Frequencies || result.Frequencies.length === 0) {
    throw new Error('No frequency pricing in API response');
  }

  const frequency = result.Frequencies[0];
  
  
  const lineItems: LineItem[] = [];
  
  // Key pricing values from API with fallbacks
  const baseCalculatedCost = frequency.CalculatedBaseCost || 0;
  const finalAdjustedCost = frequency.AdjustedBaseCost || frequency.CalculatedBaseCost || 0;
  
  // Try multiple fields for final total, with manual calculation as fallback
  let finalTotalCost = frequency.TotalRecurringCost || frequency.TotalFirstJobCost || frequency.AdjustedBaseCost;
  

  // Add base service line item (using the raw calculated cost)
  lineItems.push({
    id: 'base-service',
    name: result.ScopeName || 'Service',
    description: frequency.FrequencyName,
    quantity: 1,
    unitPrice: baseCalculatedCost,
    totalPrice: baseCalculatedCost,
    type: 'service'
  });

  // Add rate modifications as separate line items
  frequency.RateModifications.forEach(modification => {
    lineItems.push({
      id: `modification-${modification.RateModificationId}`,
      name: modification.Name,
      description: modification.IsRecurring ? 'Recurring adjustment' : 'One-time adjustment',
      quantity: modification.Quantity,
      unitPrice: modification.CalculatedCost,
      totalPrice: modification.CalculatedCost,
      type: modification.CalculatedCost < 0 ? 'discount' : 'fee'
    });
  });

  // Calculate discounts and fees from rate modifications only
  const rateModDiscounts = frequency.RateModifications
    .filter(mod => mod.CalculatedCost < 0)
    .reduce((sum, mod) => sum + Math.abs(mod.CalculatedCost), 0);

  const rateModFees = frequency.RateModifications
    .filter(mod => mod.CalculatedCost > 0)
    .reduce((sum, mod) => sum + mod.CalculatedCost, 0);

  // Use rate modification totals directly (no automatic adjustments)
  const totalDiscounts = rateModDiscounts;
  const totalFees = rateModFees;

  // Always calculate total from line items to ensure accuracy
  const calculatedTotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Use calculated total from line items instead of API total fields
  finalTotalCost = calculatedTotal;

  const pricingResult = {
    lineItems,
    subtotal: baseCalculatedCost,           // Base calculation
    discounts: totalDiscounts,              // All discounts from rate modifications
    fees: totalFees,                        // All fees from rate modifications
    taxes: 0,                               // API doesn't include taxes separately
    total: finalTotalCost                   // Total calculated from sum of all line items
  };
  
  return pricingResult;
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
    rateModifications?: any[]
  }) => {
    // Get fresh state data
    const currentFormData = state.formData;
    
    // Only calculate if we have required data
    if (!currentFormData.selectedScopeGroup || !currentFormData.selectedScope || !currentFormData.selectedFrequency) {
      return;
    }

    try {
      dispatch({ type: "SET_PRICING_LOADING", payload: true });

      // Step 1: Try to fetch questions and use real user answers if available
      let questionsForPricing: Question[] = [];
      try {
        const scopeIds = [currentFormData.selectedScope.ScopeId];
        const questionsResponse = await bookingDataService.getQuestions(authToken, scopeIds);
        
        if (questionsResponse.IsSuccess !== false && questionsResponse.Result) {
          // If we have actual user answers, use them; otherwise fall back to auto-generated
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
      } catch (error) {
      }
      
      // Step 2: Build pricing request with current data and actual selections
      const request = buildPriceCalculationRequest(
        currentFormData, 
        questionsForPricing,
        currentState?.selectedModifications || {},
        currentState?.rateModifications || []
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