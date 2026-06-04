"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { BookingProvider, useBooking } from "@/app/contexts/BookingContext"
import { AuthenticationProvider, useAuth } from "./AuthenticationProvider"
import { BookingLayout } from "./BookingLayout"
import { PricingSummary } from "./PricingSummary"
import { ServiceSelection } from "./steps/ServiceSelection"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { MultiSelect } from "@/app/components/ui/multi-select"
import { Calendar, MapPin, Clock, Check, Plus, Settings, User, CreditCard } from "lucide-react"
import { motion } from "framer-motion"
import { bookingDataService, PostalCodeResult, RateModification, Frequency, QuestionData } from "@/app/services/api/booking-data"
import { leadService } from "@/app/services/api/lead"
import { bookQuoteService } from "@/app/services/api/bookquote"
import { CustomerDetailsForm, CustomerDetailsFormRef } from "./CustomerDetailsForm"
import { CardConnectTokenizer } from "./CardConnectTokenizer"
import { BookingSuccessModal } from "./BookingSuccessModal"
import type { LeadCreateRequest, QuoteCreateRequest, QuoteScopeOfWork, QuoteRateModification, QuoteQuestion } from "@/app/types/api/lead"
import type { BookQuoteRequest, ScopeOfWork as BookQuoteScopeOfWork, RateModification as BookQuoteRateMod } from "@/app/types/api/bookquote"
import { cn } from "@/app/lib/utils"

/**
 * Section Divider Component
 * Provides visual separation between sections in single-page layout
 */
const SectionDivider = () => (
  <div 
    data-testid="section-divider" 
    className="w-full py-4"
  >
    <div className="border-t border-gray-200"></div>
  </div>
)

/**
 * SinglePageBookingContent
 * Renders all booking steps in a continuous scroll layout
 * Maintains exact same functionality and styling as multi-step version
 */
function SinglePageBookingContent() {
  const { formData, updateFormData, calculatePricingAsync, isPricingLoading } = useBooking()
  const { token } = useAuth()
  
  // Location & Schedule state (same as BookingWidget)
  const [zipCode, setZipCode] = useState(formData.zipCode || "")
  const [validatedPostalCode, setValidatedPostalCode] = useState<PostalCodeResult | null>(formData.validatedPostalCode || null)
  const [postalCodeLoading, setPostalCodeLoading] = useState(false)
  const [postalCodeError, setPostalCodeError] = useState("")
  const [availablePostalCodes, setAvailablePostalCodes] = useState<PostalCodeResult[]>([])
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(formData.selectedDate || null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState("")

  const [selectedTime, setSelectedTime] = useState(formData.selectedTime || "08:00")
  
  // Customization state (same as BookingWidget)
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(formData.selectedFrequency || null)
  const [rateModifications, setRateModifications] = useState<RateModification[]>([]) // Filtered list for UI display
  const [allRateModifications, setAllRateModifications] = useState<RateModification[]>([]) // Full list for pricing calculation
  const [selectedModifications, setSelectedModifications] = useState<Record<number, number>>({})
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})
  const [customizationLoading, setCustomizationLoading] = useState(false)
  const [customizationError, setCustomizationError] = useState("")
  const [questionsUnavailable, setQuestionsUnavailable] = useState(false)

  // Customer errors state (form data now managed in CustomerDetailsForm component)
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bookedCustomerEmail, setBookedCustomerEmail] = useState("")

  // Payment tokenization state
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [paymentExpiry, setPaymentExpiry] = useState<string | null>(null)
  const [tokenizationError, setTokenizationError] = useState<string | null>(null)

  // Lead creation state
  const [leadId, setLeadId] = useState<number | null>(null)
  const [leadCreationInProgress, setLeadCreationInProgress] = useState(false)
  const [leadCreationAttempted, setLeadCreationAttempted] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [isSaveButtonEnabled, setIsSaveButtonEnabled] = useState(false)

  // Section refs for scroll position tracking
  const serviceRef = useRef<HTMLDivElement>(null)
  const locationRef = useRef<HTMLDivElement>(null)
  const customizationRef = useRef<HTMLDivElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)
  const paymentRef = useRef<HTMLDivElement>(null)

  // Customer form ref for getting form data
  const customerFormRef = useRef<CustomerDetailsFormRef>(null)

  // Validation functions (moved early to fix declaration order)

  const arePreviousSectionsComplete = useCallback(() => {
    return (
      formData.selectedScope !== null &&
      formData.selectedScopeGroup !== null &&
      validatedPostalCode !== null &&
      selectedDate !== null &&
      selectedFrequency !== null
    )
  }, [formData.selectedScope, formData.selectedScopeGroup, validatedPostalCode, selectedDate, selectedFrequency])

  // Save button state calculation (now after validation functions)
  const updateSaveButtonState = useCallback(() => {
    const previousSectionsComplete = arePreviousSectionsComplete()
    // Enable button when previous sections are complete and lead hasn't been created
    // Customer details will be validated when button is clicked
    const canSave = previousSectionsComplete && !leadCreationInProgress && !leadCreationAttempted
    setIsSaveButtonEnabled(canSave)
  }, [arePreviousSectionsComplete, leadCreationInProgress, leadCreationAttempted])

  // Handle input blur to validate and update button state (now after updateSaveButtonState)
  const handleInputBlur = useCallback(() => {
    // Update save button state when user finishes with an input
    updateSaveButtonState()
  }, [updateSaveButtonState])

  // Load postal codes on mount (only when token is available and codes not loaded)
  useEffect(() => {
    if (token && availablePostalCodes.length === 0) {
      loadPostalCodes()
    }
  }, [token, availablePostalCodes.length]) // Include length to prevent unnecessary re-runs

  const loadPostalCodes = async () => {
    if (!token) return
    
    try {
      setPostalCodeLoading(true)
      const response = await bookingDataService.getPostalCodes(token)
      if (response.Result) {
        setAvailablePostalCodes(response.Result)
      }
    } catch (error: any) {
    } finally {
      setPostalCodeLoading(false)
    }
  }

  // Removed debounced validation - now manual only

  const validatePostalCode = () => {
    const trimmedZip = zipCode.trim()
    if (!trimmedZip) {
      setPostalCodeError("Please enter a postal code")
      setValidatedPostalCode(null)
      return
    }

    const foundPostalCode = availablePostalCodes.find(
      pc => pc.PostalCode === trimmedZip
    )

    if (foundPostalCode) {
      setValidatedPostalCode(foundPostalCode)
      setPostalCodeError("")
      updateFormData({ 
        zipCode: trimmedZip,
        validatedPostalCode: foundPostalCode 
      })
      
      // Load availability when postal code is valid
      if (formData.selectedScopeGroup) {
        loadAvailability(foundPostalCode)
      }
    } else {
      setValidatedPostalCode(null)
      setPostalCodeError("Service not available in this area")
    }
  }

  const loadAvailability = async (postalCode: PostalCodeResult) => {
    if (!token || !formData.selectedScopeGroup) return

    try {
      setAvailabilityLoading(true)
      setAvailabilityError("")

      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const response = await bookingDataService.getAvailability(
        token,
        formData.selectedScopeGroup.ScopeGroupId,
        2,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )

      if (response?.Result) {
        setAvailableDates(response.Result)
      } else {
        setAvailabilityError("No available dates found")
      }
    } catch {
      setAvailabilityError("Unable to load available dates. Please try again.")
    } finally {
      setAvailabilityLoading(false)
    }
  }

  // Generate time slots in 15-minute intervals
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour < 18; hour++) { // 8 AM to 6 PM
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const period = hour >= 12 ? 'PM' : 'AM'
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
        slots.push({ value: time24, label: displayTime })
      }
    }
    return slots
  }

  const handleDateSelect = useCallback((dateString: string) => {
    const date = new Date(dateString)
    setSelectedDate(date)

    // Set default time when first selecting a date
    if (!selectedTime) {
      setSelectedTime("08:00") // Default to 8:00 AM
    }

    updateFormData({
      selectedDate: date,
      selectedTime: selectedTime || "08:00"
    })
  }, [selectedTime, updateFormData])

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time)
    updateFormData({
      selectedTime: time
    })
  }, [updateFormData])

  useEffect(() => {
    if (token && formData.selectedScopeGroup && formData.selectedScope) {
      loadCustomizationData()
    }
  }, [token, formData.selectedScopeGroup?.ScopeGroupId, formData.selectedScope?.ScopeId])

  const loadCustomizationData = async () => {
    if (!token || !formData.selectedScopeGroup || !formData.selectedScope) return

    try {
      setCustomizationLoading(true)
      setCustomizationError("")
      setSelectedModifications({})

      let nonPercentageModifications: RateModification[] = []
      try {
        const rateModsResponse = await bookingDataService.getRateModifications(
          token,
          formData.selectedScopeGroup.ScopeGroupId
        )
        if (rateModsResponse.Result) {
          setAllRateModifications(rateModsResponse.Result)
          nonPercentageModifications = rateModsResponse.Result.filter(
            rm => !rm.IsPercentage && rm.Cost >= 0 && rm.RateModificationType === "Cleaning Extras"
          )
          setRateModifications(nonPercentageModifications)
        }
      } catch {
        // Non-fatal: rate modifications are optional for basic booking.
      }

      try {
        const questionsResponse = await bookingDataService.getQuestions(
          token,
          [formData.selectedScope.ScopeId]
        )
        if (questionsResponse.IsSuccess === false) {
          setQuestions([])
          setQuestionsUnavailable(true)
        } else if (questionsResponse.Result) {
          setQuestions(questionsResponse.Result)
          setQuestionsUnavailable(false)
        }
      } catch {
        setQuestions([])
        setQuestionsUnavailable(true)
      }

      const requiredMods = nonPercentageModifications.filter(rm => rm.IsRequired)
      if (requiredMods.length > 0) {
        setSelectedModifications(prev => {
          const next = { ...prev }
          requiredMods.forEach(mod => { next[mod.RateModificationId] = 1 })
          return next
        })
      }
    } catch {
      setCustomizationError("Unable to load customization options. Please try again.")
    } finally {
      setCustomizationLoading(false)
    }
  }

  const calculatePricing = useCallback(async () => {
    if (!token || !formData.selectedScopeGroup || !formData.selectedScope || !selectedFrequency) {
      return
    }

    const requiredQuestions = questions.filter(q => q.IsRequired)
    const hasAnsweredRequired = requiredQuestions.every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer && answer.toString().trim() !== ""
    })

    if (!hasAnsweredRequired) return

    await calculatePricingAsync(token, {
      selectedModifications,
      questionAnswers,
      rateModifications: allRateModifications,
    })
  }, [token, formData.selectedScopeGroup, formData.selectedScope, selectedFrequency, questions, questionAnswers, selectedModifications, allRateModifications, calculatePricingAsync])

  const handleFrequencySelect = useCallback(async (frequency: Frequency) => {
    setSelectedFrequency(frequency)
    updateFormData({ selectedFrequency: frequency })
  }, [updateFormData])

  const handleModificationToggle = useCallback((modId: number, quantity: number = 1) => {
    setSelectedModifications(prev => {
      const newSelected = { ...prev }
      if (quantity > 0) {
        newSelected[modId] = quantity
      } else {
        delete newSelected[modId]
      }
      return newSelected
    })
  }, [])

  const handleQuestionAnswer = useCallback((questionId: number, answer: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }, [])

  const handleMultiSelectAnswer = useCallback((questionId: number, selectedValues: string[]) => {
    // Join multiple AnswerIds with comma for API format
    const answer = selectedValues.join(",")
    handleQuestionAnswer(questionId, answer)
  }, [handleQuestionAnswer])

  // Customer field change handling now managed internally by CustomerDetailsForm component



  const createOrUpdateLead = async () => {
    if (leadCreationInProgress || leadCreationAttempted) return
    if (!arePreviousSectionsComplete()) return
    if (!token) return

    setLeadCreationInProgress(true)
    setLeadCreationAttempted(true)

    try {
      if (!customerFormRef.current) {
        throw new Error('Customer form ref is not available')
      }

      const customerData = customerFormRef.current.getFormData()

      const leadData: LeadCreateRequest = {
        FirstName: customerData.firstName.trim(),
        LastName: customerData.lastName.trim(),
        Email: customerData.email.trim(),
        Phone: customerData.phone.replace(/\D/g, ''),
        PostalCode: validatedPostalCode?.PostalCode || zipCode,
      }

      const response = await leadService.createOrUpdate(token, leadData)

      // The API returns `{ IsSuccess, Result: { LeadId } }` on success; older
      // responses occasionally put `LeadId` at the top level, so handle both.
      const leadId = response.Result?.LeadId ?? response.LeadId
      if (response.IsSuccess && leadId) {
        setLeadId(leadId)
        updateFormData({ leadId })
        await createQuoteForLead(leadId, customerData)
      } else {
        setSubmissionError(
          response.Message || response.ErrorMessage || 'Failed to create lead'
        )
      }
    } catch (error: any) {
      setSubmissionError(error?.message || 'Failed to create lead')
    } finally {
      setLeadCreationInProgress(false)
    }
  }

  const createQuoteForLead = async (leadId: number, customerData: any) => {
    if (!formData.selectedScope || !formData.selectedScopeGroup || !selectedFrequency || !token) {
      return
    }

    try {
      const rateModifications: QuoteRateModification[] = Object.entries(selectedModifications)
        .filter(([_, quantity]) => quantity > 0)
        .map(([modId, quantity]) => {
          const modIdInt = parseInt(modId)
          const rateMod = allRateModifications.find(rm => rm.RateModificationId === modIdInt)
          const isFrequencyRecurring = selectedFrequency.FrequencyId !== 'S'
          const isModificationRecurring = rateMod?.IsRecurring === true
          return {
            Quantity: quantity,
            RateModificationId: modIdInt,
            IsRecurring: isFrequencyRecurring && isModificationRecurring,
          }
        })

      const quoteQuestions: QuoteQuestion[] = Object.entries(questionAnswers)
        .filter(([_, answer]) => answer && answer.trim() !== '')
        .map(([questionId, answer]) => ({
          QuestionId: parseInt(questionId),
          Answer: answer,
        }))

      const scopesOfWork: QuoteScopeOfWork[] = [{
        ScopeOfWorkId: formData.selectedScope.ScopeId,
        FrequencyId: selectedFrequency.FrequencyId,
        RateModifications: rateModifications,
      }]

      const quoteData: QuoteCreateRequest = {
        LeadId: leadId,
        HomeAddress1: customerData.address1.trim() || 'Not provided',
        HomeAddress2: customerData.address2.trim(),
        HomeCity: customerData.city.trim() || 'Not provided',
        HomeRegion: customerData.state.trim() || 'NA',
        HomePostalCode: validatedPostalCode?.PostalCode || zipCode || '00000',
        BillingAddress1: customerData.address1.trim() || 'Not provided',
        BillingAddress2: customerData.address2.trim(),
        BillingCity: customerData.city.trim() || 'Not provided',
        BillingRegion: customerData.state.trim() || 'NA',
        BillingPostalCode: validatedPostalCode?.PostalCode || zipCode || '00000',
        SendQuoteEmail: false,
        AddToCampaigns: true,
        TriggerWebhook: true,
        ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
        ScopesOfWork: scopesOfWork,
        Questions: quoteQuestions,
        PaymentToken: paymentToken || undefined,
        PaymentExpiry: paymentExpiry || undefined,
      }

      const quoteResponse = await leadService.createOrUpdateQuote(token, quoteData)
      const quoteId = quoteResponse.Result?.QuoteId ?? quoteResponse.QuoteId
      if (quoteResponse.IsSuccess && quoteId) {
        setQuoteId(quoteId)
        updateFormData({ quoteId })
      }
    } catch {
      // Quote creation failure is non-fatal — the lead is still saved.
    }
  }

  // Manual save handler for lead and quote creation
  const handleSaveContactInfo = async () => {
    if (!arePreviousSectionsComplete()) return
    if (!validateCustomerDetails()) return
    if (leadCreationInProgress || leadCreationAttempted) return

    try {
      await createOrUpdateLead()
    } catch {
      setSubmissionError('Failed to save contact information. Please try again.')
      setLeadCreationInProgress(false)
    }
  }


  // Only update save button state when key sections change (not every field)
  useEffect(() => {
    updateSaveButtonState()
  }, [updateSaveButtonState, formData.selectedScope, formData.selectedScopeGroup, validatedPostalCode, selectedDate, selectedFrequency])

  const validateCustomerDetails = useCallback(() => {
    if (!customerFormRef.current) return false
    const validation = customerFormRef.current.validateForm()
    setCustomerErrors(validation.errors)
    return validation.isValid
  }, [])

  const handleTokenReceived = useCallback((token: string, expiry: string) => {
    setPaymentToken(token)
    setPaymentExpiry(expiry)
    setTokenizationError(null)

    updateFormData({
      payment: {
        ...formData.payment,
        paymentToken: token,
        paymentExpiry: expiry,
      },
    })
  }, [formData.payment, updateFormData])

  const handleTokenizationError = useCallback((error: string) => {
    setPaymentToken(null)
    setPaymentExpiry(null)
    setTokenizationError(error)
  }, [])

  const isFormComplete = () => {
    // Check all required fields
    const hasService = formData.selectedScope !== null
    const hasLocation = validatedPostalCode !== null
    const hasSchedule = selectedDate !== null && selectedTime !== ""
    const hasFrequency = selectedFrequency !== null

    // Check required questions
    const requiredQuestions = questions.filter(q => q.IsRequired)
    const hasAnsweredRequired = requiredQuestions.every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer && answer.toString().trim() !== ""
    })

    // Check customer details
    let hasCustomerDetails = false
    if (customerFormRef.current) {
      const customerData = customerFormRef.current.getFormData()
      hasCustomerDetails = customerData.firstName !== "" &&
                          customerData.lastName !== "" &&
                          customerData.email !== "" &&
                          customerData.phone !== ""
    }

    // Check payment token
    const hasPaymentToken = paymentToken !== null && paymentExpiry !== null

    return hasService && hasLocation && hasSchedule && hasFrequency && hasAnsweredRequired && hasCustomerDetails && hasPaymentToken
  }

  const handleBookNow = async () => {
    // First validate customer details
    if (!validateCustomerDetails()) {
      // Scroll to customer details section
      customerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Then validate payment token
    if (!paymentToken || !paymentExpiry) {
      // Scroll to payment section
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setSubmissionError("Please complete the payment information")
      return
    }

    if (!isFormComplete()) {
      // Find first incomplete section and scroll to it
      if (!formData.selectedScope) {
        serviceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (!validatedPostalCode) {
        locationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (!selectedFrequency) {
        customizationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setIsSubmitting(true)
    setSubmissionError("")

    try {
      let finalLeadId = leadId
      let finalQuoteId = quoteId

      if (!finalLeadId) {
        await handleSaveContactInfo()
        // Give React a moment to flush state updates from the save.
        await new Promise(resolve => setTimeout(resolve, 500))

        if (!leadId || !quoteId) {
          setSubmissionError('Please save your information first before booking')
          return
        }

        finalLeadId = leadId
        finalQuoteId = quoteId
      }

      if (!finalLeadId || !finalQuoteId) {
        setSubmissionError('Please save your information first before booking')
        return
      }

      // Get customer data from form ref for booking
      if (!customerFormRef.current) {
        setSubmissionError('Customer form is not available')
        return
      }

      const customerData = customerFormRef.current.getFormData()

      // Build the scopes of work for the booking
      const scopesOfWork: BookQuoteScopeOfWork[] = []

      if (formData.selectedScope && selectedFrequency && selectedDate && selectedTime) {
        // Format the date and time for FirstJobDate
        const jobDate = new Date(selectedDate)
        const [hours, minutes] = selectedTime.split(':')
        jobDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        const firstJobDate = jobDate.toISOString().replace('T', ' ').substring(0, 16)

        // Build rate modifications for booking
        const bookingRateMods: BookQuoteRateMod[] = Object.entries(selectedModifications)
          .filter(([_, quantity]) => quantity > 0)
          .map(([modId, quantity]) => {
            const modIdInt = parseInt(modId)
            const rateMod = allRateModifications.find(rm => rm.RateModificationId === modIdInt)

            const isFrequencyRecurring = selectedFrequency.FrequencyId !== 'S'
            const isModificationRecurring = rateMod?.IsRecurring === true

            return {
              RateModificationId: modIdInt,
              Quantity: quantity,
              IsRecurring: isFrequencyRecurring && isModificationRecurring
            }
          })

        // Send the pre-adjustment CalculatedBaseCost as BaseFee so the server
        // can re-apply RateModifications without double-counting.
        const baseFee = formData.pricing?.baseFee || 250

        scopesOfWork.push({
          ScopeOfWorkId: formData.selectedScope.ScopeId,
          FrequencyId: selectedFrequency.FrequencyId,
          FirstJobDate: firstJobDate,
          BaseFee: baseFee,
          RateModifications: bookingRateMods.length > 0 ? bookingRateMods : undefined
        })
      }

      // Prepare the booking request
      const bookingRequest: BookQuoteRequest = {
        SendBookedEmail: false,
        SendCustomerPortalInvite: false,
        TriggerWebhook: false,
        LeadId: finalLeadId,
        QuoteId: finalQuoteId,
        Expiry: paymentExpiry,
        Token: paymentToken,
        ScopeGroupId: formData.selectedScopeGroup?.ScopeGroupId || 6,
        ScopesOfWork: scopesOfWork,

        // Home/Service Address (required)
        HomeAddress1: customerData.address1,
        HomeAddress2: customerData.address2 || undefined,
        HomeCity: customerData.city,
        HomeRegion: customerData.state,
        HomePostalCode: validatedPostalCode?.PostalCode || zipCode,

        // Billing Address (required) - Use same as service address by default
        CustomerBillingAddress1: customerData.address1,
        CustomerBillingAddress2: customerData.address2 || undefined,
        CustomerBillingCity: customerData.city,
        CustomerBillingRegion: customerData.state,
        CustomerBillingPostalCode: validatedPostalCode?.PostalCode || zipCode
      }

      const bookingResponse = await bookQuoteService.bookQuote(token!, bookingRequest)

      if (bookingResponse.success) {
        // Update form data with booking information
        updateFormData({
          leadId: finalLeadId,
          quoteId: finalQuoteId,
          scopeGroupId: formData.selectedScopeGroup?.ScopeGroupId
        })

        // Show success modal
        setBookedCustomerEmail(customerData.email)
        setShowSuccessModal(true)
      } else {
        throw new Error(bookingResponse.error || 'Booking failed')
      }

    } catch (error: any) {
      setSubmissionError(error.message || 'Failed to complete booking. Please try again.')
      customerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <BookingLayout
      pricing={formData.pricing}
      selectedService={formData.selectedScope?.Name}
      selectedDate={formData.selectedDate}
      selectedTime={formData.selectedTime}
      zipCode={formData.zipCode}
      isPricingLoading={isPricingLoading}
    >
      <div 
        data-testid="single-page-container"
        className="space-y-0 overflow-y-auto"
      >
        {/* Section 1: Service Selection */}
        <div ref={serviceRef} data-testid="section-service" className="py-3 sm:py-6">
          <ServiceSelection />
        </div>

        <SectionDivider />

        {/* Section 2: Customization - Moved up to get service details early for accurate pricing */}
        <div ref={customizationRef} data-testid="section-customization" className="py-3 sm:py-6">
          <div className="space-y-4 sm:space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">
                Customize Your Service
              </h2>
              <p className="text-gray-600">
                Select frequency, add-ons, and answer service questions
              </p>
            </div>

            {customizationLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            ) : customizationError ? (
              <Card className="p-8">
                <div className="text-center">
                  <p className="text-red-600">{customizationError}</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Frequency Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Service Frequency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      {(formData.selectedScope?.Frequencies || []).map((frequency, index) => (
                        <motion.button
                          key={frequency.FrequencyId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleFrequencySelect(frequency)}
                          className={cn(
                            "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
                            selectedFrequency?.FrequencyId === frequency.FrequencyId
                              ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                              : "border-gray-400 hover:border-blue-400 text-gray-800"
                          )}
                        >
                          {selectedFrequency?.FrequencyId === frequency.FrequencyId && (
                            <div className="absolute top-2 right-2">
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            </div>
                          )}
                          
                          <h3 className="font-medium text-gray-900 mb-1 leading-tight">
                            {frequency.Name}
                          </h3>
                          
                          {frequency.FrequencyId === 'E1' && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              15% Savings
                            </span>
                          )}
                          {frequency.FrequencyId === 'E2' && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              10% Savings
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Rate Modifications (Add-ons) */}
                {rateModifications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          Add-on Services
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                          {rateModifications.map((modification) => {
                            const isSelected = selectedModifications[modification.RateModificationId] > 0
                            const isRequired = modification.IsRequired
                            
                            return (
                              <button
                                key={modification.RateModificationId}
                                type="button"
                                onClick={() => handleModificationToggle(
                                  modification.RateModificationId, 
                                  isSelected ? 0 : 1
                                )}
                                disabled={isRequired}
                                className={cn(
                                  "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
                                  isSelected 
                                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                                    : "border-gray-400 hover:border-blue-400 text-gray-800"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-2">
                                  <h4 className="font-medium text-gray-900 leading-tight">
                                    {modification.Name}
                                  </h4>
                                  
                                  <p className="text-sm font-medium text-green-600">
                                    {modification.CostDisplay}
                                  </p>
                                  
                                  {isRequired && (
                                    <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Service Questions */}
                {(questions.length > 0 || questionsUnavailable) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Service Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {questionsUnavailable ? (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800">
                              Service details questions are temporarily unavailable. You can continue with your booking.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                          {questions.map((question) => (
                            <div key={question.QuestionId}>
                              <Label className={cn(
                                "text-base font-medium",
                                question.IsRequired && "text-red-600"
                              )}>
                                {question.QuestionText}
                                {question.IsRequired && " *"}
                              </Label>
                              
                              {question.HelpText && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {question.HelpText}
                                </p>
                              )}
                              
                              {/* Handle different question types */}
                              {question.QuestionType === "Multiple Select List" ? (
                                <MultiSelect
                                  options={question.Answers.map(answer => ({
                                    label: answer.AnswerText,
                                    value: answer.AnswerId.toString()
                                  }))}
                                  selected={(questionAnswers[question.QuestionId] || "").split(",").filter(Boolean)}
                                  onChange={(selectedValues) => handleMultiSelectAnswer(question.QuestionId, selectedValues)}
                                  placeholder="Select options..."
                                  className="mt-2"
                                />
                              ) : question.QuestionType === "Select List" ? (
                                <Select
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onValueChange={(value) => handleQuestionAnswer(question.QuestionId, value)}
                                >
                                  <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {question.Answers.map((answer) => (
                                      <SelectItem key={`${question.QuestionId}-${answer.AnswerId}`} value={answer.AnswerId.toString()}>
                                        {answer.AnswerText}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : question.QuestionType === "Whole Number" ? (
                                <Input
                                  type="number"
                                  step="1"
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                                  placeholder="Enter a number"
                                  className="mt-2"
                                />
                              ) : question.QuestionType === "Decimal" ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                                  placeholder="Enter a decimal number"
                                  className="mt-2"
                                />
                              ) : question.QuestionType === "Rich Text" ? (
                                <textarea
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                                  placeholder="Enter your notes..."
                                  className="mt-2 w-full p-3 border border-gray-300 rounded-lg resize-y"
                                  rows={3}
                                />
                              ) : question.QuestionText.toLowerCase().includes("phone") ? (
                                <Input
                                  type="tel"
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                                  placeholder="Enter phone number"
                                  className="mt-2"
                                />
                              ) : (
                                <Input
                                  type="text"
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                                  placeholder="Enter your answer"
                                  className="mt-2"
                                />
                              )}
                            </div>
                          ))}
                          </div>
                        )}

                        {/* Calculate Pricing Button */}
                        <div className="pt-2 sm:pt-4 border-t border-gray-200 mt-3 sm:mt-6">
                          <Button
                            onClick={calculatePricing}
                            disabled={!formData.selectedScope || !selectedFrequency || isPricingLoading}
                            className="w-full sm:w-auto min-w-[200px]"
                            size="lg"
                          >
                            {isPricingLoading ? (
                              <>
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-4 h-4 mr-2"
                                >
                                  ⚙️
                                </motion.div>
                                Calculating...
                              </>
                            ) : (
                              "🧮 Calculate Pricing"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        <SectionDivider />

        {/* Section 3: Location & Schedule */}
        <div ref={locationRef} data-testid="section-location" className="py-3 sm:py-6">
          <div className="space-y-4 sm:space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">
                Location & Schedule
              </h2>
              <p className="text-gray-600">
                Enter your service location and choose your preferred date and time
              </p>
            </div>

            {/* Location Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Service Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="zipCode" variant="required">
                    Postal Code
                  </Label>
                  <div className="flex gap-2 sm:gap-3 mt-1 sm:mt-2">
                    <Input
                      id="zipCode"
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)} // No automatic validation
                      onBlur={() => {}} // Remove automatic validation on blur
                      placeholder="Enter postal code"
                      className={cn(
                        "max-w-xs",
                        postalCodeError && "border-red-500"
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validatePostalCode}
                      disabled={postalCodeLoading}
                    >
                      Validate
                    </Button>
                  </div>
                  
                  {postalCodeError && (
                    <p className="text-sm text-red-600 mt-1">{postalCodeError}</p>
                  )}
                  
                  {validatedPostalCode && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <p className="text-sm text-green-800">
                        ✓ Service available in {validatedPostalCode.ZoneName} zone
                      </p>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Section */}
            {validatedPostalCode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Select Date & Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-4">
                    {availabilityLoading ? (
                      <div className="flex justify-center p-8">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                      </div>
                    ) : availabilityError ? (
                      <div className="text-center p-4">
                        <p className="text-red-600">{availabilityError}</p>
                      </div>
                    ) : availableDates.length > 0 ? (
                      <div>
                        <Label>Available Dates</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-1 sm:mt-2">
                          {availableDates.slice(0, 9).map((dateString) => {
                            const date = new Date(dateString)
                            const isSelected = selectedDate?.toISOString() === date.toISOString()
                            
                            return (
                              <button
                                key={dateString}
                                onClick={() => handleDateSelect(dateString)}
                                className={cn(
                                  "p-3 rounded-lg border-2 transition-all text-sm",
                                  isSelected
                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                    : "border-gray-300 hover:border-blue-400"
                                )}
                              >
                                <div className="font-medium">
                                  {date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {date.toLocaleDateString('en-US', { 
                                    weekday: 'short' 
                                  })}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        
                        {selectedDate && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 sm:mt-6 space-y-2 sm:space-y-4">
                            {/* Time Selection */}
                            <div>
                              <Label htmlFor="timeSlot">Select Time</Label>
                              <Select
                                value={selectedTime}
                                onValueChange={handleTimeSelect}
                              >
                                <SelectTrigger id="timeSlot" className="w-full sm:w-64 mt-2">
                                  <SelectValue placeholder="Choose a time" />
                                </SelectTrigger>
                                <SelectContent>
                                  {generateTimeSlots().map((slot) => (
                                    <SelectItem key={slot.value} value={slot.value}>
                                      {slot.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Selected Date & Time Summary */}
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-700">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                  Selected: {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                  })} at {generateTimeSlots().find(s => s.value === selectedTime)?.label || "9:00 AM"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">No available dates found. Please try a different location.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        <SectionDivider />

        {/* Section 4: Customer Details */}
        <div ref={customerRef} data-testid="section-customer" className="py-3 sm:py-6">
          <div className="space-y-4 sm:space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">
                Customer Details
              </h2>
              <p className="text-gray-600">
                Enter your contact information to complete your booking
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contact Information
                  </div>
                  {leadId && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1 text-xs text-green-600 font-normal"
                    >
                      <Check className="w-3 h-3" />
                      Saved
                    </motion.div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissionError && (
                  <div className="mb-3 sm:mb-6 p-2 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{submissionError}</p>
                  </div>
                )}
                
                <div className="space-y-3 sm:space-y-6">
                    <CustomerDetailsForm
                      ref={customerFormRef}
                      initialValues={{
                        firstName: "",
                        lastName: "",
                        email: "",
                        phone: "",
                        address1: "",
                        address2: "",
                        city: "",
                        state: "",
                      }}
                      postalCode={validatedPostalCode?.PostalCode || zipCode}
                      errors={customerErrors}
                      disabled={isSubmitting}
                    />

                    {/* Save Contact Information Button */}
                    <div className="pt-2 sm:pt-4 border-t border-gray-200">
                      <Button
                        onClick={handleSaveContactInfo}
                        disabled={!isSaveButtonEnabled || leadCreationInProgress}
                        className="w-full sm:w-auto min-w-[200px]"
                        size="lg"
                      >
                        {leadCreationInProgress ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Saving Information...
                          </>
                        ) : leadId ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Information Saved
                          </>
                        ) : (
                          'Save Contact Information'
                        )}
                      </Button>

                      {!isSaveButtonEnabled && !leadCreationAttempted && (
                        <p className="text-sm text-gray-500 mt-2">
                          Complete all previous sections and contact details to save
                        </p>
                      )}

                      {leadId && quoteId && (
                        <motion.p
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-green-600 mt-2 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Contact information and service details saved successfully
                        </motion.p>
                      )}
                    </div>
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <SectionDivider />

        {/* Section 5: Payment Information */}
        <div ref={paymentRef} data-testid="section-payment" className="py-3 sm:py-6">
          <div className="space-y-4 sm:space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">
                Payment Information
              </h2>
              <p className="text-gray-600">
                Secure payment processing with CardConnect
              </p>
            </div>

            {/* Payment Token Status */}
            {paymentToken && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-800">
                    Payment information secured successfully
                  </p>
                </div>
              </div>
            )}

            {/* Tokenization Error */}
            {tokenizationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{tokenizationError}</p>
              </div>
            )}

            {/* CardConnect Tokenizer */}
            <CardConnectTokenizer
              onTokenReceived={handleTokenReceived}
              onError={handleTokenizationError}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Final Submit Section with Pricing and Button */}
        {/* Mobile Pricing Summary - Show before Book Now button */}
        <div className="lg:hidden mt-8">
          <PricingSummary
            pricing={formData.pricing}
            selectedService={formData.selectedScope?.Name}
            selectedDate={formData.selectedDate}
            selectedTime={formData.selectedTime}
            zipCode={formData.zipCode}
            isPricingLoading={isPricingLoading}
          />
        </div>

        <div className="py-8 mt-12 border-t border-gray-200">
          <div className="flex flex-col items-end gap-2">
            {/* Show save status if needed */}
            {!leadId && !quoteId && isFormComplete() && (
              <p className="text-sm text-amber-600">
                Please save your information first before booking
              </p>
            )}

            {leadId && quoteId && (
              <p className="text-sm text-green-600">
                ✓ Information saved. Ready to book!
              </p>
            )}

            <Button
              onClick={handleBookNow}
              disabled={!isFormComplete() || isSubmitting || (!leadId && leadCreationInProgress)}
              variant="primary"
              size="lg"
              className="min-w-48"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Booking...
                </span>
              ) : leadCreationInProgress ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </span>
              ) : (
                "Book Now"
              )}
            </Button>
          </div>
        </div>
      </div>
    </BookingLayout>

    {/* Success Modal */}
    <BookingSuccessModal
      isOpen={showSuccessModal}
      onClose={() => setShowSuccessModal(false)}
      customerEmail={bookedCustomerEmail}
      leadId={leadId}
      selectedService={formData.selectedScope?.Name}
      selectedDate={selectedDate}
      selectedTime={selectedTime}
      zipCode={zipCode}
    />
    </>
  )
}

/**
 * SinglePageBookingFlow Component
 * Wrapper component that provides authentication and booking context
 */
export function SinglePageBookingFlow() {
  return (
    <AuthenticationProvider>
      <BookingProvider>
        <SinglePageBookingContent />
      </BookingProvider>
    </AuthenticationProvider>
  )
}