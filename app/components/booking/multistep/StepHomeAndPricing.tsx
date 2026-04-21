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
import { FrequencyPicker } from "@/app/components/booking/pickers/FrequencyPicker"
import { RateModsPicker } from "@/app/components/booking/pickers/RateModsPicker"
import { QuestionsForm } from "@/app/components/booking/pickers/QuestionsForm"
import { ApiErrorBanner } from "@/app/components/booking/ApiErrorBanner"
import { filterQuestionsForStep } from "./questionStep"
import { utmToApiFields } from "@/app/lib/utm"

interface StepHomeAndPricingProps {
  frequencyByScope: Record<number, Frequency>
  onFrequencyByScopeChange: (
    value:
      | Record<number, Frequency>
      | ((prev: Record<number, Frequency>) => Record<number, Frequency>)
  ) => void
  modsByScope: Record<number, Record<number, number>>
  onModsByScopeChange: (
    value:
      | Record<number, Record<number, number>>
      | ((prev: Record<number, Record<number, number>>) => Record<number, Record<number, number>>)
  ) => void
  onRateModificationsLoaded: (rateModifications: RateModification[]) => void
  questions: QuestionData[]
  questionsUnavailable: boolean
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

interface BillingAddressState extends AddressState {
  postalCode: string
}

// Filter the scope-group's rate mods down to the ones that apply to a specific
// scope. A ScopeId of 0 means "applies to every scope in the group" — common
// for group-wide extras.
const rateModsForScope = (all: RateModification[], scopeId: number) =>
  all.filter(rm => rm.ScopeId === 0 || rm.ScopeId === scopeId)

export function StepHomeAndPricing({
  frequencyByScope,
  onFrequencyByScopeChange,
  modsByScope,
  onModsByScopeChange,
  onRateModificationsLoaded,
  questions,
  questionsUnavailable,
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
  const [billingSameAsService, setBillingSameAsService] = useState<boolean>(
    formData.payment?.billingAddress?.sameAsService ?? true
  )
  const [billingAddress, setBillingAddress] = useState<BillingAddressState>({
    line1: formData.payment?.billingAddress?.street ?? "",
    line2: "",
    city: formData.payment?.billingAddress?.city ?? "",
    state: formData.payment?.billingAddress?.state ?? "",
    postalCode: formData.payment?.billingAddress?.zipCode ?? "",
  })
  const [billingErrors, setBillingErrors] = useState<Partial<Record<keyof BillingAddressState, string>>>({})
  const [loadingCustomization, setLoadingCustomization] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const scopeGroupId = formData.selectedScopeGroup?.ScopeGroupId
  const selectedScopes = formData.selectedScopes
  const scopeIdsKey = selectedScopes.map(s => s.ScopeId).sort((a, b) => a - b).join(",")

  // Load rate modifications once the scope group is known. Each scope card
  // filters the list locally by ScopeId.
  useEffect(() => {
    if (!token || !scopeGroupId || selectedScopes.length === 0) return

    let cancelled = false
    setLoadingCustomization(true)

    bookingDataService
      .getRateModifications(token, scopeGroupId)
      .then(res =>
        (res.Result ?? []).filter(
          rm => !rm.IsPercentage && rm.Cost >= 0 && rm.RateModificationType === "Cleaning Extras"
        )
      )
      .catch(() => [] as RateModification[])
      .then(rateMods => {
        if (cancelled) return
        setRateModifications(rateMods)
        onRateModificationsLoaded(rateMods)
        // Auto-check required rate mods for every scope they apply to.
        const required = rateMods.filter(rm => rm.IsRequired)
        if (required.length) {
          onModsByScopeChange(prev => {
            const next = { ...prev }
            for (const scope of selectedScopes) {
              const current = { ...(next[scope.ScopeId] ?? {}) }
              for (const rm of required) {
                if (rm.ScopeId === 0 || rm.ScopeId === scope.ScopeId) {
                  current[rm.RateModificationId] = 1
                }
              }
              next[scope.ScopeId] = current
            }
            return next
          })
        }
        setLoadingCustomization(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeGroupId, scopeIdsKey])

  // Step 2 only renders during-pricing questions — before-pricing lives on
  // Step 1 and after-pricing on Step 3.
  const duringPricingQuestions = filterQuestionsForStep(questions, "duringPricing")

  const allRequiredStep2QuestionsAnswered = duringPricingQuestions
    .filter(q => q.IsRequired)
    .every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer !== undefined && answer.toString().trim() !== ""
    })

  const everyScopeHasFrequency =
    selectedScopes.length > 0 && selectedScopes.every(s => !!frequencyByScope[s.ScopeId])

  const canCalculatePrice =
    !!token &&
    !!formData.selectedScopeGroup &&
    everyScopeHasFrequency &&
    allRequiredStep2QuestionsAnswered

  const frequencyKey = selectedScopes
    .map(s => `${s.ScopeId}:${frequencyByScope[s.ScopeId]?.FrequencyId ?? ""}`)
    .join("|")
  const modificationsKey = JSON.stringify(modsByScope)
  const answersKey = JSON.stringify(questionAnswers)

  // Auto-recalculate pricing whenever any input that affects price changes.
  // Debounced so typing in a Whole Number question doesn't spam the API.
  useEffect(() => {
    if (!canCalculatePrice || !token) return
    const handle = setTimeout(() => {
      calculatePricingAsync(token, {
        frequencyByScope,
        modsByScope,
        questionAnswers,
        rateModifications,
      })
    }, 400)
    return () => clearTimeout(handle)
    // The _Key values stringify the records so the effect fires only on actual
    // content changes. Shallow-comparing the record references would cancel
    // every debounce and re-fire on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCalculatePrice, token, frequencyKey, modificationsKey, answersKey])

  const handleFrequencyChange = (scopeId: number, frequency: Frequency) => {
    onFrequencyByScopeChange(prev => ({ ...prev, [scopeId]: frequency }))
    // Mirror the first scope's frequency into the legacy singular field so
    // consumers that haven't migrated (BookingLayout badge, single-page flow)
    // keep showing something sensible.
    if (selectedScopes[0]?.ScopeId === scopeId) {
      updateFormData({ selectedFrequency: frequency })
    }
  }

  const handleToggleRateMod = (scopeId: number, modId: number, nextQuantity: number) => {
    onModsByScopeChange(prev => {
      const next = { ...prev }
      const current = { ...(next[scopeId] ?? {}) }
      if (nextQuantity <= 0) delete current[modId]
      else current[modId] = nextQuantity
      next[scopeId] = current
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

  const validateBillingAddress = (): boolean => {
    if (billingSameAsService) {
      setBillingErrors({})
      return true
    }
    const next: Partial<Record<keyof BillingAddressState, string>> = {}
    if (!billingAddress.line1.trim()) next.line1 = "Required"
    if (!billingAddress.city.trim()) next.city = "Required"
    if (!billingAddress.state.trim()) next.state = "Required"
    else if (billingAddress.state.trim().length !== 2) next.state = "Use 2-letter state code"
    if (!billingAddress.postalCode.trim()) next.postalCode = "Required"
    setBillingErrors(next)
    return Object.keys(next).length === 0
  }

  const canContinue =
    canCalculatePrice &&
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim() !== "" &&
    formData.pricing.total > 0 &&
    !!formData.leadId

  const buildQuoteScopesOfWork = (): QuoteScopeOfWork[] =>
    selectedScopes.map(scope => {
      const frequency = frequencyByScope[scope.ScopeId]
      const scopeMods = modsByScope[scope.ScopeId] ?? {}
      const isFrequencyRecurring = frequency?.FrequencyId !== undefined && frequency.FrequencyId !== "S"
      const rateMods: QuoteRateModification[] = Object.entries(scopeMods)
        .filter(([, quantity]) => quantity > 0)
        .map(([modId, quantity]) => {
          const id = parseInt(modId)
          const rateMod = rateModifications.find(r => r.RateModificationId === id)
          return {
            RateModificationId: id,
            Quantity: quantity,
            IsRecurring: isFrequencyRecurring && rateMod?.IsRecurring === true,
          }
        })
      return {
        ScopeOfWorkId: scope.ScopeId,
        FrequencyId: frequency?.FrequencyId ?? "",
        RateModifications: rateMods,
      }
    })

  const handleContinue = async () => {
    setSubmissionError("")
    const addrOk = validateAddress()
    const billingOk = validateBillingAddress()
    if (!addrOk || !billingOk) return
    if (
      !canContinue ||
      !token ||
      !formData.leadId ||
      !formData.selectedScopeGroup ||
      selectedScopes.length === 0
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const postalCode = formData.validatedPostalCode?.PostalCode ?? formData.zipCode

      const quoteQuestions: QuoteQuestion[] = Object.entries(questionAnswers)
        .filter(([, answer]) => answer && answer.trim() !== "")
        .map(([questionId, answer]) => ({
          QuestionId: parseInt(questionId),
          Answer: answer,
        }))

      const effectiveBilling = billingSameAsService
        ? {
            line1: address.line1.trim(),
            line2: address.line2.trim() || undefined,
            city: address.city.trim(),
            state: address.state.trim().toUpperCase(),
            postalCode,
          }
        : {
            line1: billingAddress.line1.trim(),
            line2: billingAddress.line2.trim() || undefined,
            city: billingAddress.city.trim(),
            state: billingAddress.state.trim().toUpperCase(),
            postalCode: billingAddress.postalCode.trim(),
          }

      const quoteRequest: QuoteCreateRequest = {
        LeadId: formData.leadId,
        QuoteId: formData.quoteId,
        HomeAddress1: address.line1.trim(),
        HomeAddress2: address.line2.trim() || undefined,
        HomeCity: address.city.trim(),
        HomeRegion: address.state.trim().toUpperCase(),
        HomePostalCode: postalCode,
        BillingAddress1: effectiveBilling.line1,
        BillingAddress2: effectiveBilling.line2,
        BillingCity: effectiveBilling.city,
        BillingRegion: effectiveBilling.state,
        BillingPostalCode: effectiveBilling.postalCode,
        SendQuoteEmail: true,
        AddToCampaigns: true,
        TriggerWebhook: true,
        ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
        ScopesOfWork: buildQuoteScopesOfWork(),
        Questions: quoteQuestions,
        ...utmToApiFields(formData.utm),
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
        payment: {
          ...formData.payment,
          billingAddress: {
            sameAsService: billingSameAsService,
            street: effectiveBilling.line1,
            city: effectiveBilling.city,
            state: effectiveBilling.state,
            zipCode: effectiveBilling.postalCode,
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

  const showScopeHeaders = selectedScopes.length > 1

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[30px] font-bold text-gray-900 mb-2">Your home &amp; pricing</h2>
        <p className="text-gray-600">
          Pick how often you&rsquo;d like {selectedScopes.length > 1 ? "each service" : "service"},
          add any extras, and tell us where we&rsquo;ll be cleaning so we can price your quote.
        </p>
      </div>

      {selectedScopes.map(scope => {
        const scopeFrequency = frequencyByScope[scope.ScopeId] ?? null
        const scopeMods = rateModsForScope(rateModifications, scope.ScopeId)
        return (
          <div key={scope.ScopeId} className="space-y-6">
            {showScopeHeaders && (
              <div className="border-l-4 border-blue-600 pl-3">
                <h3 className="text-lg font-semibold text-gray-900">{scope.Name}</h3>
              </div>
            )}
            <FrequencyPicker
              frequencies={scope.Frequencies}
              selectedFrequencyId={scopeFrequency?.FrequencyId ?? null}
              onChange={freq => handleFrequencyChange(scope.ScopeId, freq)}
            />
            {scopeFrequency && scopeMods.length > 0 && (
              <RateModsPicker
                rateModifications={scopeMods}
                selectedQuantities={modsByScope[scope.ScopeId] ?? {}}
                onToggle={(id, qty) => handleToggleRateMod(scope.ScopeId, id, qty)}
              />
            )}
          </div>
        )
      })}

      {/* "During Pricing" questions span all scopes — the API returns them
          per-scope but IDs are unique, so one form covers the whole group. */}
      {everyScopeHasFrequency && !loadingCustomization && (duringPricingQuestions.length > 0 || questionsUnavailable) && (
        <QuestionsForm
          questions={duringPricingQuestions}
          answers={questionAnswers}
          onChange={setQuestionAnswer}
          unavailable={questionsUnavailable}
        />
      )}

      {everyScopeHasFrequency && (
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

              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={billingSameAsService}
                    onChange={e => setBillingSameAsService(e.target.checked)}
                  />
                  <span className="text-sm text-gray-800">
                    Billing address is the same as service address
                  </span>
                </label>
              </div>

              {!billingSameAsService && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-2"
                >
                  <div className="text-sm font-medium text-gray-900">Billing address</div>
                  <div>
                    <Label htmlFor="billingLine1" variant="required">Street address</Label>
                    <Input
                      id="billingLine1"
                      value={billingAddress.line1}
                      onChange={e => setBillingAddress(prev => ({ ...prev, line1: e.target.value }))}
                      className={cn("mt-2", billingErrors.line1 && "border-red-500")}
                      aria-invalid={!!billingErrors.line1}
                    />
                    {billingErrors.line1 && <p className="text-red-600 text-xs mt-1">{billingErrors.line1}</p>}
                  </div>
                  <div>
                    <Label htmlFor="billingLine2">Apt / suite (optional)</Label>
                    <Input
                      id="billingLine2"
                      value={billingAddress.line2}
                      onChange={e => setBillingAddress(prev => ({ ...prev, line2: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="billingCity" variant="required">City</Label>
                      <Input
                        id="billingCity"
                        value={billingAddress.city}
                        onChange={e => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                        className={cn("mt-2", billingErrors.city && "border-red-500")}
                        aria-invalid={!!billingErrors.city}
                      />
                      {billingErrors.city && <p className="text-red-600 text-xs mt-1">{billingErrors.city}</p>}
                    </div>
                    <div>
                      <Label htmlFor="billingState" variant="required">State</Label>
                      <Input
                        id="billingState"
                        value={billingAddress.state}
                        onChange={e =>
                          setBillingAddress(prev => ({ ...prev, state: e.target.value.toUpperCase() }))
                        }
                        className={cn("mt-2", billingErrors.state && "border-red-500")}
                        aria-invalid={!!billingErrors.state}
                        placeholder="e.g. SC"
                        maxLength={2}
                      />
                      {billingErrors.state && <p className="text-red-600 text-xs mt-1">{billingErrors.state}</p>}
                    </div>
                    <div>
                      <Label htmlFor="billingZip" variant="required">Postal code</Label>
                      <Input
                        id="billingZip"
                        value={billingAddress.postalCode}
                        onChange={e =>
                          setBillingAddress(prev => ({ ...prev, postalCode: e.target.value }))
                        }
                        className={cn("mt-2", billingErrors.postalCode && "border-red-500")}
                        aria-invalid={!!billingErrors.postalCode}
                      />
                      {billingErrors.postalCode && (
                        <p className="text-red-600 text-xs mt-1">{billingErrors.postalCode}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <ApiErrorBanner message={submissionError} />

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
