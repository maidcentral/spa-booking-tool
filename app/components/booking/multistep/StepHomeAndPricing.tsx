"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/app/lib/utils"
import { useBooking } from "@/app/contexts/BookingContext"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import {
  bookingDataService,
  type Frequency,
  type QuestionData,
  type RateModification,
} from "@/app/services/api/booking-data"
import { leadService } from "@/app/services/api/lead"
import type {
  QuoteCreateRequest,
  QuoteQuestion,
  QuoteRateModification,
  QuoteScopeOfWork,
} from "@/app/types/api/lead"
import { ServiceSelection } from "@/app/components/booking/steps/ServiceSelection"
import { FrequencyPicker } from "@/app/components/booking/pickers/FrequencyPicker"
import { RateModsPicker } from "@/app/components/booking/pickers/RateModsPicker"
import { QuestionsForm } from "@/app/components/booking/pickers/QuestionsForm"
import { filterQuestionsForStep } from "./questionStep"

interface StepHomeAndPricingProps {
  selectedFrequency: Frequency | null
  onFrequencyChange: (frequency: Frequency | null) => void
  selectedModifications: Record<number, number>
  onModificationsChange: (
    value:
      | Record<number, number>
      | ((prev: Record<number, number>) => Record<number, number>)
  ) => void
  onRateModificationsLoaded: (rateModifications: RateModification[]) => void
  questions: QuestionData[]
  onQuestionsLoaded: (questions: QuestionData[]) => void
  questionsUnavailable: boolean
  onQuestionsUnavailableChange: (unavailable: boolean) => void
  questionAnswers: Record<number, string>
  onQuestionAnswersChange: (
    value:
      | Record<number, string>
      | ((prev: Record<number, string>) => Record<number, string>)
  ) => void
  onCompleted: () => void
  onBack: () => void
}

interface AddressState {
  line1: string
  line2: string
  city: string
  state: string
}

export function StepHomeAndPricing({
  selectedFrequency,
  onFrequencyChange,
  selectedModifications,
  onModificationsChange,
  onRateModificationsLoaded,
  questions,
  onQuestionsLoaded,
  questionsUnavailable,
  onQuestionsUnavailableChange,
  questionAnswers,
  onQuestionAnswersChange,
  onCompleted,
  onBack,
}: StepHomeAndPricingProps) {
  const { token } = useAuth()
  const { formData, updateFormData, calculatePricingAsync } = useBooking()

  const [rateModifications, setRateModifications] = useState<RateModification[]>([])
  const [address, setAddress] = useState<AddressState>({
    line1: formData.customer?.address?.street ?? "",
    line2: "",
    city: formData.customer?.address?.city ?? "",
    state: formData.customer?.address?.state ?? "",
  })
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressState, string>>>({})
  const [loadingCustomization, setLoadingCustomization] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const scopeGroupId = formData.selectedScopeGroup?.ScopeGroupId
  const scopeId = formData.selectedScope?.ScopeId

  // Load rate modifications + questions when a service is picked.
  useEffect(() => {
    if (!token || !scopeGroupId || !scopeId) return

    let cancelled = false
    setLoadingCustomization(true)

    Promise.all([
      bookingDataService
        .getRateModifications(token, scopeGroupId)
        .then(res =>
          (res.Result ?? []).filter(
            rm => !rm.IsPercentage && rm.Cost >= 0 && rm.RateModificationType === "Cleaning Extras"
          )
        )
        .catch(() => [] as RateModification[]),
      bookingDataService
        .getQuestions(token, [scopeId])
        .then(res => {
          if (res.IsSuccess === false) {
            return { unavailable: true, items: [] as QuestionData[] }
          }
          return { unavailable: false, items: res.Result ?? [] }
        })
        .catch(() => ({ unavailable: true, items: [] as QuestionData[] })),
    ]).then(([rateMods, questionsResult]) => {
      if (cancelled) return
      setRateModifications(rateMods)
      onRateModificationsLoaded(rateMods)
      onQuestionsLoaded(questionsResult.items)
      onQuestionsUnavailableChange(questionsResult.unavailable)
      const required = rateMods.filter(rm => rm.IsRequired)
      if (required.length) {
        onModificationsChange(prev => {
          const next = { ...prev }
          required.forEach(r => {
            next[r.RateModificationId] = 1
          })
          return next
        })
      }
      setLoadingCustomization(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeGroupId, scopeId])

  // Questions rendered inside Step 2 (before + during pricing). Questions
  // tagged "After Pricing" are rendered on Step 3 instead.
  const beforePricingQuestions = filterQuestionsForStep(questions, "beforePricing")
  const duringPricingQuestions = filterQuestionsForStep(questions, "duringPricing")
  const step2Questions = [...beforePricingQuestions, ...duringPricingQuestions]

  // Only this step's required questions gate Continue; afterPricing required
  // questions are the responsibility of Step 3.
  const allRequiredStep2QuestionsAnswered = step2Questions
    .filter(q => q.IsRequired)
    .every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer !== undefined && answer.toString().trim() !== ""
    })

  const canCalculatePrice =
    !!token &&
    !!formData.selectedScopeGroup &&
    !!formData.selectedScope &&
    !!selectedFrequency &&
    allRequiredStep2QuestionsAnswered

  // Auto-recalculate pricing whenever any input that affects price changes.
  // Debounced so typing in a Whole Number question doesn't spam the API.
  // Stringify the maps once per render so the effect deps stay shallow-comparable
  // and the eslint plugin can statically check them.
  const modificationsKey = JSON.stringify(selectedModifications)
  const answersKey = JSON.stringify(questionAnswers)

  useEffect(() => {
    if (!canCalculatePrice || !token) return
    const handle = setTimeout(() => {
      calculatePricingAsync(token, {
        selectedModifications,
        questionAnswers,
        rateModifications,
      })
    }, 400)
    return () => clearTimeout(handle)
    // selectedModifications/questionAnswers/rateModifications are intentionally
    // referenced through their stringified key + the stable reference inside the
    // timeout callback, not as effect dependencies — re-running on every shallow
    // change would cancel the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCalculatePrice, token, selectedFrequency?.FrequencyId, modificationsKey, answersKey])

  const handleFrequencyChange = (frequency: Frequency) => {
    onFrequencyChange(frequency)
    updateFormData({ selectedFrequency: frequency })
  }

  const handleToggleRateMod = (id: number, nextQuantity: number) => {
    onModificationsChange(prev => {
      const next = { ...prev }
      if (nextQuantity <= 0) delete next[id]
      else next[id] = nextQuantity
      return next
    })
  }

  const setQuestionAnswer = (questionId: number, answer: string) => {
    onQuestionAnswersChange(prev => ({ ...prev, [questionId]: answer }))
  }

  const validateAddress = (): boolean => {
    const next: Partial<Record<keyof AddressState, string>> = {}
    if (!address.line1.trim()) next.line1 = "Required"
    if (!address.city.trim()) next.city = "Required"
    if (!address.state.trim()) next.state = "Required"
    else if (address.state.trim().length !== 2) next.state = "Use 2-letter state code"
    setAddressErrors(next)
    return Object.keys(next).length === 0
  }

  const canContinue =
    canCalculatePrice &&
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim() !== "" &&
    formData.pricing.total > 0 &&
    !!formData.leadId

  const handleContinue = async () => {
    setSubmissionError("")
    if (!validateAddress()) return
    if (
      !canContinue ||
      !token ||
      !formData.leadId ||
      !selectedFrequency ||
      !formData.selectedScope ||
      !formData.selectedScopeGroup
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const postalCode = formData.validatedPostalCode?.PostalCode ?? formData.zipCode

      const quoteRateMods: QuoteRateModification[] = Object.entries(selectedModifications)
        .filter(([, quantity]) => quantity > 0)
        .map(([modId, quantity]) => {
          const id = parseInt(modId)
          const rateMod = rateModifications.find(r => r.RateModificationId === id)
          const isFrequencyRecurring = selectedFrequency.FrequencyId !== "S"
          return {
            RateModificationId: id,
            Quantity: quantity,
            IsRecurring: isFrequencyRecurring && rateMod?.IsRecurring === true,
          }
        })

      const quoteQuestions: QuoteQuestion[] = Object.entries(questionAnswers)
        .filter(([, answer]) => answer && answer.trim() !== "")
        .map(([questionId, answer]) => ({
          QuestionId: parseInt(questionId),
          Answer: answer,
        }))

      const scopesOfWork: QuoteScopeOfWork[] = [
        {
          ScopeOfWorkId: formData.selectedScope.ScopeId,
          FrequencyId: selectedFrequency.FrequencyId,
          RateModifications: quoteRateMods,
        },
      ]

      const quoteRequest: QuoteCreateRequest = {
        LeadId: formData.leadId,
        QuoteId: formData.quoteId,
        HomeAddress1: address.line1.trim(),
        HomeAddress2: address.line2.trim() || undefined,
        HomeCity: address.city.trim(),
        HomeRegion: address.state.trim().toUpperCase(),
        HomePostalCode: postalCode,
        BillingAddress1: address.line1.trim(),
        BillingAddress2: address.line2.trim() || undefined,
        BillingCity: address.city.trim(),
        BillingRegion: address.state.trim().toUpperCase(),
        BillingPostalCode: postalCode,
        SendQuoteEmail: false,
        AddToCampaigns: true,
        TriggerWebhook: true,
        ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
        ScopesOfWork: scopesOfWork,
        Questions: quoteQuestions,
      }

      const response = await leadService.createOrUpdateQuote(token, quoteRequest)
      const quoteId = response.Result?.QuoteId ?? response.QuoteId
      if (!response.IsSuccess || !quoteId) {
        setSubmissionError(
          response.Message || response.ErrorMessage || "Failed to save your quote"
        )
        return
      }

      updateFormData({
        quoteId,
        scopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
        customer: {
          ...formData.customer,
          address: {
            street: address.line1.trim(),
            city: address.city.trim(),
            state: address.state.trim().toUpperCase(),
            zipCode: postalCode,
          },
        },
      })

      onCompleted()
    } catch (err: any) {
      setSubmissionError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[30px] font-bold text-gray-900 mb-2">Your home &amp; pricing</h2>
        <p className="text-gray-600">
          Tell us about the service and where we&rsquo;ll be cleaning so we can generate a quote.
        </p>
      </div>

      <ServiceSelection />

      {/* "Before Pricing" questions render as soon as the scope is picked —
          they often drive the quote (e.g. square footage, bedrooms). */}
      {formData.selectedScope && !loadingCustomization && beforePricingQuestions.length > 0 && (
        <QuestionsForm
          title="A few details"
          questions={beforePricingQuestions}
          answers={questionAnswers}
          onChange={setQuestionAnswer}
        />
      )}

      {formData.selectedScope && (
        <FrequencyPicker
          frequencies={formData.selectedScope.Frequencies}
          selectedFrequencyId={selectedFrequency?.FrequencyId ?? null}
          onChange={handleFrequencyChange}
        />
      )}

      {selectedFrequency && (
        <RateModsPicker
          rateModifications={rateModifications}
          selectedQuantities={selectedModifications}
          onToggle={handleToggleRateMod}
        />
      )}

      {/* "During Pricing" questions (the default bucket when QuestionStepType is
          missing) render alongside the pricing card. */}
      {selectedFrequency && !loadingCustomization && (duringPricingQuestions.length > 0 || questionsUnavailable) && (
        <QuestionsForm
          questions={duringPricingQuestions}
          answers={questionAnswers}
          onChange={setQuestionAnswer}
          unavailable={questionsUnavailable}
        />
      )}

      {selectedFrequency && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Service Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="line1" variant="required">Street address</Label>
                <Input
                  id="line1"
                  value={address.line1}
                  onChange={e => setAddress(prev => ({ ...prev, line1: e.target.value }))}
                  className={cn("mt-2", addressErrors.line1 && "border-red-500")}
                  aria-invalid={!!addressErrors.line1}
                />
                {addressErrors.line1 && <p className="text-red-600 text-xs mt-1">{addressErrors.line1}</p>}
              </div>
              <div>
                <Label htmlFor="line2">Apt / suite (optional)</Label>
                <Input
                  id="line2"
                  value={address.line2}
                  onChange={e => setAddress(prev => ({ ...prev, line2: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" variant="required">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={e => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    className={cn("mt-2", addressErrors.city && "border-red-500")}
                    aria-invalid={!!addressErrors.city}
                  />
                  {addressErrors.city && <p className="text-red-600 text-xs mt-1">{addressErrors.city}</p>}
                </div>
                <div>
                  <Label htmlFor="state" variant="required">State</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={e =>
                      setAddress(prev => ({ ...prev, state: e.target.value.toUpperCase() }))
                    }
                    className={cn("mt-2", addressErrors.state && "border-red-500")}
                    aria-invalid={!!addressErrors.state}
                    placeholder="e.g. SC"
                    maxLength={2}
                  />
                  {addressErrors.state && <p className="text-red-600 text-xs mt-1">{addressErrors.state}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {submissionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submissionError}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue || isSubmitting} size="lg">
          {isSubmitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  )
}
