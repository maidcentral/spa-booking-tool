import type { ScopeGroup, Scope, Frequency, PostalCodeResult } from "@/app/services/api/booking-data"

// Booking form types
export interface BookingStep {
  id: string
  title: string
  description: string
  isCompleted: boolean
  isActive: boolean
}

export interface ServiceType {
  id: string
  name: string
  description: string
  basePrice: number
  duration: number
  category: string
  icon: string
  image?: string
  isPopular?: boolean
}

export interface ServiceCategory {
  id: string
  name: string
  description: string
  serviceTypes: ServiceType[]
}

export interface PricingFactor {
  id: string
  name: string
  type: "select" | "number" | "checkbox"
  required: boolean
  options?: PricingOption[]
  pricePerUnit?: number
  min?: number
  max?: number
}

export interface PricingOption {
  label: string
  value: string
  priceModifier: number
  description?: string
}

export interface Extra {
  id: string
  name: string
  description: string
  price: number
  category: string
  maxQuantity: number
  isPopular: boolean
  icon?: string
}

export interface FrequencyOption {
  id: string
  name: string
  description: string
  type: "one-time" | "weekly" | "bi-weekly" | "monthly" | "custom"
  multiplier: number
  discount?: number
}

export interface TimeSlot {
  id: string
  time: string
  available: boolean
  price?: number
}

export interface AvailableDate {
  date: Date
  timeSlots: TimeSlot[]
}

export interface CustomField {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "checkbox" | "number"
  required: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
}

export interface LineItem {
  id: string
  name: string
  description?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  type: "service" | "extra" | "fee" | "discount" | "tax"
}

export interface BookingPricing {
  lineItems: LineItem[]
  subtotal: number
  discounts: number
  fees: number
  taxes: number
  total: number
}

export interface BookingFormData {
  // Service Selection from ScopeGroups
  selectedScopeGroup?: ScopeGroup
  selectedScope?: Scope
  selectedFrequency?: Frequency
  // Legacy service fields (for backwards compatibility)
  selectedService?: ServiceType
  selectedCategory?: ServiceCategory
  pricingParameters: Record<string, any>
  
  // Location & Schedule
  zipCode: string
  validatedPostalCode?: PostalCodeResult
  selectedDate?: Date
  selectedTime?: string
  
  // Customization
  selectedExtras: Array<{ extra: Extra; quantity: number }>
  frequency: FrequencyOption
  customFields: Record<string, any>
  
  // Customer Details
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
    specialInstructions?: string
  }
  
  // Payment
  payment: {
    method: "card" | "paypal" | "bank"
    billingAddress?: {
      sameAsService: boolean
      street?: string
      city?: string
      state?: string
      zipCode?: string
    }
  }
  
  // Pricing
  pricing: BookingPricing
}

export interface BookingContextType {
  formData: BookingFormData
  updateFormData: (data: Partial<BookingFormData>) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  steps: BookingStep[]
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  isPricingLoading: boolean
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  calculatePricing: () => void
  calculatePricingAsync: (authToken: string, currentState?: {
    selectedModifications?: Record<number, number>
    questionAnswers?: Record<number, string>
    rateModifications?: any[]
  }) => Promise<void>
}