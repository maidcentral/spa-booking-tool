"use client"

import React, { useState, useEffect, useCallback } from "react"
import { BookingProvider, useBooking } from "@/app/contexts/BookingContext"
import { useAuth } from "./AuthenticationProvider"
import { BookingLayout } from "./BookingLayout"
import { ProgressIndicator } from "./ProgressIndicator"
import { ServiceSelection } from "./steps/ServiceSelection"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { MultiSelect } from "@/app/components/ui/multi-select"
import { Calendar, MapPin, Clock, Check, Plus, Settings, User } from "lucide-react"
import { motion } from "framer-motion"
import { bookingDataService, PostalCodeResult, RateModification, Frequency, QuestionData } from "@/app/services/api/booking-data"
import { maidCentralApi } from "@/app/services/api/maidcentral"
import { CustomerDetailsForm } from "./CustomerDetailsForm"
import type { LeadCreateRequest } from "@/app/types/api"
import { cn } from "@/app/lib/utils"
import { debounce } from "lodash"

// Import other steps (we'll create these next)
// import { Customization } from "./steps/Customization"
// import { CustomerDetails } from "./steps/CustomerDetails"

function BookingContent() {
  const { formData, currentStep, steps, setCurrentStep, updateFormData, calculatePricingAsync, isPricingLoading } = useBooking()
  const { token } = useAuth()
  
  // Location & Schedule state
  const [zipCode, setZipCode] = useState(formData.zipCode || "")
  const [validatedPostalCode, setValidatedPostalCode] = useState<PostalCodeResult | null>(formData.validatedPostalCode || null)
  const [postalCodeLoading, setPostalCodeLoading] = useState(false)
  const [postalCodeError, setPostalCodeError] = useState("")
  const [availablePostalCodes, setAvailablePostalCodes] = useState<PostalCodeResult[]>([])
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(formData.selectedDate || null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState("")
  
  const [selectedTime, setSelectedTime] = useState(formData.selectedTime || "")
  
  // Step 3: Customization state
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(formData.selectedFrequency || null)
  const [rateModifications, setRateModifications] = useState<RateModification[]>([]) // Filtered list for UI display
  const [allRateModifications, setAllRateModifications] = useState<RateModification[]>([]) // Full list for pricing calculation
  const [selectedModifications, setSelectedModifications] = useState<Record<number, number>>({})
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})
  const [customizationLoading, setCustomizationLoading] = useState(false)
  const [customizationError, setCustomizationError] = useState("")
  const [questionsUnavailable, setQuestionsUnavailable] = useState(false)
  
  // Customer details state
  const [customerDetails, setCustomerDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // Load postal codes on mount
  useEffect(() => {
    if (token && currentStep === 2 && availablePostalCodes.length === 0) {
      loadPostalCodes()
    }
  }, [token, currentStep])

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
      
      // Calculate date range (next 30 days)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
      
      const response = await bookingDataService.getAvailability(
        token,
        formData.selectedScopeGroup.ScopeGroupId,
        2, // Default 2 hours duration
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      if (response.Result) {
        setAvailableDates(response.Result)
      }
    } catch (error: any) {
      setAvailabilityError("Unable to load available dates. Please try again.")
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const handleDateSelect = (dateString: string) => {
    const date = new Date(dateString)
    setSelectedDate(date)
    
    // Extract time from the ISO string
    const time = dateString.split('T')[1]?.substring(0, 5) || "09:00"
    setSelectedTime(time)
    
    updateFormData({
      selectedDate: date,
      selectedTime: time
    })
  }

  // Load customization data for step 2
  useEffect(() => {
    if (token && currentStep === 1 && formData.selectedScopeGroup && formData.selectedScope) {
      loadCustomizationData()
    }
  }, [token, currentStep, formData.selectedScopeGroup, formData.selectedScope])

  const loadCustomizationData = async () => {
    if (!token || !formData.selectedScopeGroup || !formData.selectedScope) return
    
    try {
      setCustomizationLoading(true)
      setCustomizationError("")
      
      // Clear any previously selected modifications when service changes
      setSelectedModifications({})
      
      // Load rate modifications first
      let rateModsResponse
      let nonPercentageModifications: any[] = []
      try {
        rateModsResponse = await bookingDataService.getRateModifications(token, formData.selectedScopeGroup.ScopeGroupId)
        if (rateModsResponse.Result) {
          // Rate modifications loaded successfully)

          // Filter by ScopeId and exclude discount codes and fees
          const filteredMods = rateModsResponse.Result.filter(
            rm => rm.ScopeId === formData.selectedScope.ScopeId &&
                  rm.RateModificationType !== "Discount Codes" &&
                  rm.RateModificationType !== "Fees"
          )

          // Store the FILTERED list for pricing calculation (only mods for this scope)
          setAllRateModifications(filteredMods)

          // Track excluded mods for debugging
          const excludedMods = rateModsResponse.Result.filter(
            rm => rm.ScopeId !== formData.selectedScope.ScopeId ||
                  rm.RateModificationType === "Discount Codes" ||
                  rm.RateModificationType === "Fees"
          )

          // Some rate modifications were excluded from the UI

          nonPercentageModifications = filteredMods
          setRateModifications(nonPercentageModifications)

          // Rate modifications filtered and ready for display
        }
      } catch (error) {
      }
      
      // Load questions separately with error handling
      try {
        const questionsResponse = await bookingDataService.getQuestions(token, [formData.selectedScope.ScopeId])
        
        // Check for API error response
        if (questionsResponse.IsSuccess === false) {
          setQuestions([]) // Set empty questions array
          setQuestionsUnavailable(true) // Mark questions as unavailable
          // Don't set an error message that blocks the form
        } else if (questionsResponse.Result) {
          setQuestions(questionsResponse.Result)
          setQuestionsUnavailable(false)
        }
      } catch (error: any) {
        // Handle network errors or other failures
        setQuestions([]) // Set empty questions array to allow form to continue
        setQuestionsUnavailable(true) // Mark questions as unavailable
        // Don't show blocking error for questions
      }
      
      // Auto-select required modifications (only non-percentage ones)
      if (nonPercentageModifications && nonPercentageModifications.length > 0) {
        const requiredMods = nonPercentageModifications.filter(rm => rm.IsRequired)
        if (requiredMods.length > 0) {
          setSelectedModifications(prev => {
            const newSelectedMods = { ...prev }
            requiredMods.forEach(mod => {
              newSelectedMods[mod.RateModificationId] = 1
            })
            return newSelectedMods
          })
        }
      }
      
    } catch (error: any) {
      setCustomizationError("Unable to load customization options. Please try again.")
    } finally {
      setCustomizationLoading(false)
    }
  }

  const handleFrequencySelect = async (frequency: Frequency) => {
    setSelectedFrequency(frequency)
    updateFormData({ selectedFrequency: frequency })
    
    // Recalculate pricing when frequency changes (if we have all required data)
    if (token && formData.selectedScopeGroup && formData.selectedScope) {
      // Slightly longer delay to ensure React state updates have propagated
      setTimeout(async () => {
        const currentWidgetState = {
          selectedModifications,
          questionAnswers,
          rateModifications: allRateModifications // Use full list for pricing calculation
        };
        await calculatePricingAsync(token, currentWidgetState)
      }, 200)
    }
  }

  const handleModificationToggle = (modId: number, quantity: number = 1) => {
    setSelectedModifications(prev => {
      const newSelected = { ...prev }
      if (quantity > 0) {
        newSelected[modId] = quantity
      } else {
        delete newSelected[modId]
      }
      return newSelected
    })
  }

  const handleQuestionAnswer = (questionId: number, answer: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleMultiSelectAnswer = (questionId: number, selectedValues: string[]) => {
    // Join multiple AnswerIds with comma for API format
    const answer = selectedValues.join(",")
    handleQuestionAnswer(questionId, answer)
  }

  // Debounced pricing calculation for real-time updates
  const debouncedCalculatePricing = useCallback(
    debounce(async () => {
      // Only calculate pricing if all required conditions are met
      if (token && formData.selectedScopeGroup && formData.selectedScope && selectedFrequency) {
        // Check if all required questions are answered
        const requiredQuestions = questions.filter(q => q.IsRequired)
        const hasAnsweredRequired = requiredQuestions.every(q => {
          const answer = questionAnswers[q.QuestionId]
          return answer && answer.toString().trim() !== ""
        })

        if (hasAnsweredRequired) {
          const currentWidgetState = {
            selectedModifications,
            questionAnswers,
            rateModifications: allRateModifications // Use full list for pricing calculation
          }
          await calculatePricingAsync(token, currentWidgetState)
        }
      }
    }, 300),
    [token, formData.selectedScopeGroup, formData.selectedScope, selectedFrequency, selectedModifications, questionAnswers, questions, allRateModifications]
  )

  // Trigger pricing calculation on changes
  useEffect(() => {
    debouncedCalculatePricing()
  }, [selectedFrequency, selectedModifications, questionAnswers, questions])

  const handleCustomerFieldChange = (field: string, value: string) => {
    if (field === "emailError") {
      setCustomerErrors(prev => ({ ...prev, email: value }))
      return
    }
    
    setCustomerDetails(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear field error when user starts typing
    if (customerErrors[field]) {
      setCustomerErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateCustomerDetails = () => {
    const errors: Record<string, string> = {}
    
    if (!customerDetails.firstName.trim()) {
      errors.firstName = "First name is required"
    }
    
    if (!customerDetails.lastName.trim()) {
      errors.lastName = "Last name is required"
    }
    
    if (!customerDetails.email.trim()) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.email)) {
      errors.email = "Please enter a valid email address"
    }
    
    if (!customerDetails.phone.trim()) {
      errors.phone = "Phone number is required"
    } else if (customerDetails.phone.replace(/\D/g, "").length !== 10) {
      errors.phone = "Please enter a valid 10-digit phone number"
    }
    
    setCustomerErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleBookNow = async () => {
    // First validate customer details
    if (!validateCustomerDetails()) {
      return
    }
    
    setIsSubmitting(true)
    setSubmissionError("")
    
    try {
      // Prepare the lead creation request
      const leadRequest: LeadCreateRequest = {
        SendLeadEmail: false,
        TriggerWebhook: false,
        FirstName: customerDetails.firstName.trim(),
        LastName: customerDetails.lastName.trim(),
        Email: customerDetails.email.trim(),
        Phone: customerDetails.phone.trim(),
        PostalCode: validatedPostalCode?.PostalCode || zipCode
      }
      
      
      // Call the API to create the lead
      const leadResponse = await maidCentralApi.createOrUpdateLead(leadRequest as any)
      
      
      // Show success state
      setBookingSuccess(true)
      
    } catch (error: any) {
      setSubmissionError(error.message || 'Failed to submit booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinueLocationSchedule = async () => {
    if (validatedPostalCode && selectedDate && selectedTime) {
      // Move to customer details step (pricing is handled in real-time now)
      setCurrentStep(3)
    }
  }

  const handleContinueCustomization = async () => {
    if (selectedFrequency && isCustomizationComplete()) {
      // Update formData with current selections
      updateFormData({ selectedFrequency })
      
      // Move to location & schedule step
      setCurrentStep(2)
    }
  }

  const isCustomizationComplete = () => {
    // Check if all required questions are answered
    const requiredQuestions = questions.filter(q => q.IsRequired)
    return requiredQuestions.every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer && answer.toString().trim() !== ""
    })
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <ServiceSelection />
      case 1:
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {questions.map((question) => (
                            <div key={question.QuestionId}>
                              <Label className="text-base font-medium">
                                {question.QuestionText}
                                {question.IsRequired && <span className="text-red-600"> *</span>}
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
                                  isRequired={question.IsRequired}
                                />
                              ) : question.QuestionType === "Select List" ? (
                                <Select
                                  value={questionAnswers[question.QuestionId] || ""}
                                  onValueChange={(value) => handleQuestionAnswer(question.QuestionId, value)}
                                >
                                  <SelectTrigger className={cn(
                                    "mt-2",
                                    question.IsRequired && "!bg-white !border-red-200 !text-gray-900 [&>span]:!text-gray-900"
                                  )}
                                  style={question.IsRequired ? {
                                    backgroundColor: '#ffffff',
                                    borderColor: '#fecaca',
                                    color: '#111827'
                                  } : undefined}>
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                  <SelectContent className={cn(
                                    question.IsRequired && "!bg-white !border-gray-200 !text-gray-900 shadow-lg"
                                  )}
                                  style={question.IsRequired ? {
                                    backgroundColor: '#ffffff',
                                    borderColor: '#e5e7eb',
                                    color: '#111827'
                                  } : undefined}>
                                    {question.Answers.map((answer, index) => (
                                      <SelectItem
                                        key={`${question.QuestionId}-answer-${index}`}
                                        value={answer.AnswerId.toString()}
                                        className={cn(
                                          question.IsRequired && "!text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 data-[highlighted]:!bg-gray-100"
                                        )}
                                      >
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
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Continue Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleContinueCustomization}
                    disabled={!selectedFrequency || !isCustomizationComplete()}
                    variant="primary"
                    size="lg"
                    className="min-w-32"
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        )
      case 2:
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
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
                  <div className="flex gap-3 mt-2">
                    <Input
                      id="zipCode"
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      onBlur={validatePostalCode}
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
                  <CardContent className="space-y-4">
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
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
                            className="mt-4 p-3 bg-blue-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2 text-blue-700">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">
                                Selected: {selectedDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric'
                                })} at {selectedTime || "9:00 AM"}
                              </span>
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

            {/* Continue Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleContinueLocationSchedule}
                disabled={!validatedPostalCode || !selectedDate || !selectedTime}
                variant="primary"
                size="lg"
                className="min-w-32"
              >
                Continue
              </Button>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Customer Details
              </h2>
              <p className="text-gray-600">
                Enter your contact information to complete your booking
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissionError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{submissionError}</p>
                  </div>
                )}
                
                {bookingSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center"
                  >
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Booking Request Submitted!
                    </h3>
                    <p className="text-gray-600">
                      Thank you for your booking request. We'll contact you shortly to confirm your service.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                      A confirmation email has been sent to {customerDetails.email}
                    </p>
                  </motion.div>
                ) : (
                  <CustomerDetailsForm
                    firstName={customerDetails.firstName}
                    lastName={customerDetails.lastName}
                    email={customerDetails.email}
                    phone={customerDetails.phone}
                    postalCode={validatedPostalCode?.PostalCode || zipCode}
                    onFieldChange={handleCustomerFieldChange}
                    errors={customerErrors}
                    disabled={isSubmitting}
                  />
                )}
              </CardContent>
            </Card>

            {/* Book Now Button */}
            {!bookingSuccess && (
              <div className="flex justify-end">
                <Button
                  onClick={handleBookNow}
                  disabled={isSubmitting}
                  variant="primary"
                  size="lg"
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Submitting...
                    </span>
                  ) : (
                    "Book Now"
                  )}
                </Button>
              </div>
            )}
          </div>
        )
      default:
        // Default to step 0 (ServiceSelection) if currentStep is out of range
        return <ServiceSelection />
    }
  }

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to completed steps or the next immediate step
    if (stepIndex <= currentStep + 1) {
      setCurrentStep(stepIndex)
    }
  }

  return (
    <BookingLayout
      pricing={formData.pricing}
      selectedService={formData.selectedScope?.Name}
      selectedDate={formData.selectedDate}
      selectedTime={formData.selectedTime}
      zipCode={formData.zipCode}
      isPricingLoading={isPricingLoading}
    >
      {/* Progress Indicator */}
      <ProgressIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        className="mb-8"
      />

      {/* Current Step Content */}
      {renderCurrentStep()}
    </BookingLayout>
  )
}

export function BookingWidget() {
  return (
    <BookingProvider>
      <BookingContent />
    </BookingProvider>
  )
}