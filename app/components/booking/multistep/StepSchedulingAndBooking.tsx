"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Clock, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { cn } from "@/app/lib/utils"
import { useBooking } from "@/app/contexts/BookingContext"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import {
  bookingDataService,
  type Frequency,
  type QuestionData,
  type RateModification,
} from "@/app/services/api/booking-data"
import { bookQuoteService } from "@/app/services/api/bookquote"
import { leadService } from "@/app/services/api/lead"
import type {
  QuoteCreateRequest,
  QuoteQuestion,
  QuoteScopeOfWork,
} from "@/app/types/api/lead"
import { QuestionsForm } from "@/app/components/booking/pickers/QuestionsForm"
import { filterQuestionsForStep } from "./questionStep"
import { utmToApiFields } from "@/app/lib/utm"
import type {
  BookQuoteRequest,
  ScopeOfWork as BookQuoteScopeOfWork,
  RateModification as BookQuoteRateMod,
} from "@/app/types/api/bookquote"
import { CardConnectTokenizer } from "@/app/components/booking/CardConnectTokenizer"
import { BookingSuccessModal } from "@/app/components/booking/BookingSuccessModal"
import { ApiErrorBanner } from "@/app/components/booking/ApiErrorBanner"
import { clearPersistedBooking } from "@/app/lib/booking-storage"
import { track } from "@/app/lib/tracker"

interface StepSchedulingAndBookingProps {
  frequencyByScope: Record<number, Frequency>
  selectedRateModifications: RateModification[]
  modsByScope: Record<number, Record<number, number>>
  selectedDate: string | null
  onDateChange: (date: string | null) => void
  selectedTime: string
  onTimeChange: (time: string) => void
  questions: QuestionData[]
  questionAnswers: Record<number, string>
  onQuestionAnswerChange: (questionId: number, answer: string) => void
  onBack: () => void
}

function generateTimeSlots() {
  const slots: { value: string; label: string }[] = []
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      const period = hour >= 12 ? "PM" : "AM"
      const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const label = `${display}:${minute.toString().padStart(2, "0")} ${period}`
      slots.push({ value, label })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

// MaidCentral's built-in form auto-applies these to the first scope of every
// new booking — TagId 11 ("First Time") and 13 ("In & Out Of Rotation"). The
// Lead API no longer applies them automatically, so the Partner must pass
// them explicitly (docs gap §11). If future tenants need custom defaults,
// swap this for a picker on Step 3.
const DEFAULT_FIRST_JOB_TAGS = [11, 13]

// MaidCentral's `tblBillingTerms` default row. 2 = credit card — matches the
// only payment path we support (CardConnect tokenized card). Pull into a
// picker if we ever expose ACH or alternate billing terms.
const DEFAULT_BILLING_TERMS_ID = 2

// Discount-code UI is off by default because the public Lead API has no
// validation endpoint for promo codes yet (docs gap §2). Partners can flip
// this on to surface the input as a stub; it currently rejects every code so
// the visitor sees the field but nothing actually applies. When the API gets
// POST /api/Lead/ApplyDiscountCode, swap the stub for the real call.
const DISCOUNT_CODES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DISCOUNT_CODES === "true"

export function StepSchedulingAndBooking({
  frequencyByScope,
  selectedRateModifications,
  modsByScope,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  questions,
  questionAnswers,
  onQuestionAnswerChange,
  onBack,
}: StepSchedulingAndBookingProps) {
  const afterPricingQuestions = filterQuestionsForStep(questions, "afterPricing")
  const allRequiredAfterPricingAnswered = afterPricingQuestions
    .filter(q => q.IsRequired)
    .every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer !== undefined && answer.toString().trim() !== ""
    })
  const { token } = useAuth()
  const { formData } = useBooking()

  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState("")
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [paymentExpiry, setPaymentExpiry] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [discountCodeInput, setDiscountCodeInput] = useState("")
  const [discountCodeError, setDiscountCodeError] = useState("")
  const [discountCodeChecking, setDiscountCodeChecking] = useState(false)
  // Bumped to force React to unmount + remount the CardConnect iframe after a
  // booking failure. The iframe's internal CVV state can wedge across retries;
  // remounting guarantees a clean slate.
  const [cardFormResetKey, setCardFormResetKey] = useState(0)

  const resetPaymentForm = () => {
    setPaymentToken(null)
    setPaymentExpiry(null)
    setPaymentError(null)
    setCardFormResetKey(k => k + 1)
  }

  const scopeGroupId = formData.selectedScopeGroup?.ScopeGroupId
  // Hours come from the latest CalculatePrice response; the Availability endpoint
  // uses them to size per-day capacity. Fall back to 2 only if pricing never ran —
  // matches the old constant so we don't worsen an already-degraded state.
  const availabilityHours = formData.pricing.totalHours || 2

  useEffect(() => {
    if (!token || !scopeGroupId) return

    let cancelled = false
    setAvailabilityLoading(true)
    setAvailabilityError("")

    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 30)

    bookingDataService
      .getAvailability(
        token,
        scopeGroupId,
        availabilityHours,
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0]
      )
      .then(response => {
        if (cancelled) return
        const dates = response.Result ?? []
        setAvailableDates(dates)
        // If the user previously picked a date for a different service, drop it
        // when it isn't valid against the new availability set.
        if (selectedDate && !dates.includes(selectedDate)) {
          onDateChange(null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setAvailabilityError("Unable to load available dates. Please try again.")
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false)
      })

    return () => {
      cancelled = true
    }
    // selectedDate / onDateChange intentionally excluded — they're only consulted
    // inside the resolver and including them would refetch on every date change.
    // availabilityHours IS included so the calendar updates if the visitor goes
    // back and changes frequency/rate mods, which changes the per-day hour load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeGroupId, availabilityHours])

  const selectedScopes = formData.selectedScopes
  const everyScopeHasFrequency =
    selectedScopes.length > 0 && selectedScopes.every(s => !!frequencyByScope[s.ScopeId])

  const canBook =
    !!token &&
    !!formData.leadId &&
    !!formData.quoteId &&
    !!formData.selectedScopeGroup &&
    everyScopeHasFrequency &&
    !!selectedDate &&
    !!selectedTime &&
    !!paymentToken &&
    !!paymentExpiry &&
    allRequiredAfterPricingAnswered

  // Build a per-scope rate-mods list for one scope. Typed with required
  // IsRecurring so it satisfies both QuoteRateModification (where IsRecurring
  // is optional) and BookQuoteRateMod (where it's required).
  type BuiltRateMod = { RateModificationId: number; Quantity: number; IsRecurring: boolean }
  const buildRateModsForScope = (scopeId: number): BuiltRateMod[] => {
    const frequency = frequencyByScope[scopeId]
    const isFrequencyRecurring = frequency?.FrequencyId !== undefined && frequency.FrequencyId !== "S"
    return Object.entries(modsByScope[scopeId] ?? {})
      .filter(([, quantity]) => quantity > 0)
      .map(([modId, quantity]) => {
        const id = parseInt(modId)
        const rateMod = selectedRateModifications.find(r => r.RateModificationId === id)
        return {
          RateModificationId: id,
          Quantity: quantity,
          IsRecurring: isFrequencyRecurring && rateMod?.IsRecurring === true,
        }
      })
  }

  const handleBookNow = async () => {
    setSubmissionError("")
    if (
      !canBook ||
      !token ||
      !formData.leadId ||
      !formData.quoteId ||
      !formData.selectedScopeGroup ||
      selectedScopes.length === 0 ||
      !selectedDate ||
      !paymentToken ||
      !paymentExpiry
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const postalCode = formData.validatedPostalCode?.PostalCode ?? formData.zipCode
      const address1 = formData.customer?.address?.street ?? ""
      const city = formData.customer?.address?.city ?? ""
      const region = formData.customer?.address?.state ?? ""
      // Step 2 persists the billing-address choice. When the visitor ticked
      // "Billing address same as service address" we mirror the service fields;
      // otherwise use the separate billing values they entered.
      const billing = formData.payment?.billingAddress
      const billingSame = billing?.sameAsService ?? true
      const billingAddress1 = billingSame ? address1 : billing?.street ?? address1
      const billingCity = billingSame ? city : billing?.city ?? city
      const billingRegion = billingSame ? region : billing?.state ?? region
      const billingPostal = billingSame ? postalCode : billing?.zipCode ?? postalCode

      // Persist any "After Pricing" question answers onto the quote before booking.
      if (afterPricingQuestions.length > 0) {
        const quoteQuestions: QuoteQuestion[] = Object.entries(questionAnswers)
          .filter(([, answer]) => answer && answer.trim() !== "")
          .map(([questionId, answer]) => ({
            QuestionId: parseInt(questionId),
            Answer: answer,
          }))

        const quoteScopesOfWork: QuoteScopeOfWork[] = selectedScopes.map(scope => ({
          ScopeOfWorkId: scope.ScopeId,
          FrequencyId: frequencyByScope[scope.ScopeId]?.FrequencyId ?? "",
          RateModifications: buildRateModsForScope(scope.ScopeId),
        }))

        const quoteUpdate: QuoteCreateRequest = {
          LeadId: formData.leadId,
          QuoteId: formData.quoteId,
          HomeAddress1: address1,
          HomeCity: city,
          HomeRegion: region,
          HomePostalCode: postalCode,
          BillingAddress1: billingAddress1,
          BillingCity: billingCity,
          BillingRegion: billingRegion,
          BillingPostalCode: billingPostal,
          // Suppress the duplicate quote email — the customer got one on the
          // Step 2 save; this update is just persisting after-pricing answers.
          SendQuoteEmail: false,
          AddToCampaigns: true,
          TriggerWebhook: true,
          ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
          ScopesOfWork: quoteScopesOfWork,
          Questions: quoteQuestions,
          ...utmToApiFields(formData.utm),
        }

        const quoteResponse = await leadService.createOrUpdateQuote(token, quoteUpdate)
        if (!quoteResponse.IsSuccess) {
          setSubmissionError(
            quoteResponse.Message || quoteResponse.ErrorMessage || "Failed to save your final answers"
          )
          return
        }
      }

      const jobDate = new Date(selectedDate)
      const [hours, minutes] = selectedTime.split(":")
      jobDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      const firstJobDate = jobDate.toISOString().replace("T", " ").substring(0, 16)

      // Every scope books on the same calendar day for now. Spec 02-flow-mapping
      // §Book notes that multi-frequency scopes may need staggered start dates
      // (`firstJobDate + GetDaysBetweenByServiceTypeId(frequency)`); defer that
      // refinement until we have a concrete tenant using it.
      //
      // First-job tags: apply MaidCentral's built-in defaults [11, 13] ("First
      // Time" + "In & Out Of Rotation") to the first scope only. The public
      // Lead API no longer auto-applies these (docs gap §11); without them,
      // tenants who expect those tags on every new booking don't get them.
      const scopesOfWork: BookQuoteScopeOfWork[] = selectedScopes.map((scope, index) => {
        const rateMods: BookQuoteRateMod[] = buildRateModsForScope(scope.ScopeId)
        return {
          ScopeOfWorkId: scope.ScopeId,
          FrequencyId: frequencyByScope[scope.ScopeId]?.FrequencyId ?? "",
          FirstJobDate: firstJobDate,
          BaseFee: formData.pricing.perScope[scope.ScopeId]?.baseFee ?? 0,
          RateModifications: rateMods.length > 0 ? rateMods : undefined,
          FirstJobTags: index === 0 ? DEFAULT_FIRST_JOB_TAGS : undefined,
        }
      })

      const bookingRequest: BookQuoteRequest = {
        SendBookedEmail: true,
        // Customer portal flow is out of scope for the Partner rebuild — leave off.
        SendCustomerPortalInvite: false,
        TriggerWebhook: true,
        LeadId: formData.leadId,
        QuoteId: formData.quoteId,
        Expiry: paymentExpiry,
        Token: paymentToken,
        BillingTermsId: DEFAULT_BILLING_TERMS_ID,
        ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
        ScopesOfWork: scopesOfWork,
        HomeAddress1: address1,
        HomeCity: city,
        HomeRegion: region,
        HomePostalCode: postalCode,
        CustomerBillingAddress1: billingAddress1,
        CustomerBillingCity: billingCity,
        CustomerBillingRegion: billingRegion,
        CustomerBillingPostalCode: billingPostal,
        ...utmToApiFields(formData.utm),
      }

      const response = await bookQuoteService.bookQuote(token, bookingRequest)
      if (!response.success) {
        setSubmissionError(response.error || "Booking failed")
        track({ type: "booking_error", step: 2, message: response.error || "Booking failed" })
        // Remount the CardConnect iframe — the token can be rejected by the
        // processor and trying again without a fresh iframe usually fails the
        // same way.
        resetPaymentForm()
        return
      }

      // Booking confirmed — drop the in-flight localStorage payload so that a
      // reload or new visit starts from a clean slate instead of rehydrating
      // a completed quote.
      clearPersistedBooking()
      track({
        type: "booking_completed",
        quoteId: formData.quoteId,
        leadId: formData.leadId,
      })
      setShowSuccessModal(true)
    } catch (err: any) {
      const message = err?.message || "Something went wrong. Please try again."
      setSubmissionError(message)
      track({ type: "booking_error", step: 2, message })
      resetPaymentForm()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApplyDiscountCode = async () => {
    setDiscountCodeError("")
    const code = discountCodeInput.trim()
    if (!code) {
      setDiscountCodeError("Please enter a code")
      return
    }
    setDiscountCodeChecking(true)
    try {
      // Stub: the public Lead API has no discount-code validation endpoint
      // (docs gap §2). Until POST /api/Lead/ApplyDiscountCode exists we reject
      // every code. The input is hidden by default (DISCOUNT_CODES_ENABLED)
      // so visitors don't see a teaser they can't use.
      await new Promise(r => setTimeout(r, 300))
      setDiscountCodeError("That code isn't valid.")
    } finally {
      setDiscountCodeChecking(false)
    }
  }

  const closeSuccessModal = () => {
    setShowSuccessModal(false)
    if (typeof window !== "undefined") window.location.reload()
  }

  const selectedDateObj = selectedDate ? new Date(selectedDate) : null
  const selectedTimeLabel = TIME_SLOTS.find(s => s.value === selectedTime)?.label

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[30px] font-bold text-gray-900 mb-2">Pick a time &amp; book</h2>
        <p className="text-gray-600">
          Choose when you&rsquo;d like us to come and confirm your booking.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Date &amp; Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availabilityLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : availabilityError ? (
              <p className="text-sm text-red-600">{availabilityError}</p>
            ) : availableDates.length === 0 ? (
              <p className="text-gray-600">No available dates found in the next 30 days.</p>
            ) : (
              <>
                <Label>Available Dates</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mt-1 sm:mt-2 max-h-72 overflow-y-auto">
                  {availableDates.map(dateString => {
                    const date = new Date(dateString)
                    const isSelected = selectedDate === dateString
                    return (
                      <button
                        key={dateString}
                        type="button"
                        onClick={() => onDateChange(dateString)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-sm text-center",
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-gray-300 hover:border-blue-400"
                        )}
                      >
                        <div className="font-medium">
                          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedDateObj && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 sm:mt-6 space-y-2 sm:space-y-4"
                  >
                    <div>
                      <Label htmlFor="timeSlot">Select Time</Label>
                      <Select value={selectedTime} onValueChange={onTimeChange}>
                        <SelectTrigger id="timeSlot" className="w-full sm:w-64 mt-2">
                          <SelectValue placeholder="Choose a time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(slot => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTime && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Selected:{" "}
                            {selectedDateObj.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}{" "}
                            at {selectedTimeLabel}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {selectedDate && selectedTime && afterPricingQuestions.length > 0 && (
        <QuestionsForm
          title="Before you book"
          questions={afterPricingQuestions}
          answers={questionAnswers}
          onChange={onQuestionAnswerChange}
        />
      )}

      {DISCOUNT_CODES_ENABLED && selectedDate && selectedTime && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promo code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCodeInput}
                onChange={e => {
                  setDiscountCodeInput(e.target.value)
                  if (discountCodeError) setDiscountCodeError("")
                }}
                placeholder="e.g. SPRING25"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                aria-invalid={!!discountCodeError}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyDiscountCode}
                disabled={discountCodeChecking}
              >
                {discountCodeChecking ? "Checking…" : "Apply"}
              </Button>
            </div>
            {discountCodeError && <p className="text-sm text-red-600">{discountCodeError}</p>}
          </CardContent>
        </Card>
      )}

      {selectedDate && selectedTime && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <CardConnectTokenizer
            key={cardFormResetKey}
            onTokenReceived={(tok, expiry) => {
              setPaymentToken(tok)
              setPaymentExpiry(expiry)
              setPaymentError(null)
            }}
            onError={err => {
              setPaymentToken(null)
              setPaymentExpiry(null)
              setPaymentError(err)
            }}
          />
        </motion.div>
      )}

      {paymentError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {paymentError}
        </div>
      )}

      {paymentToken && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 text-sm text-green-700"
        >
          <Check className="w-4 h-4" />
          <span>Payment method ready</span>
        </motion.div>
      )}

      <ApiErrorBanner message={submissionError} />

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleBookNow} disabled={!canBook || isSubmitting} size="lg">
          {isSubmitting ? "Booking…" : "Book now"}
        </Button>
      </div>

      <BookingSuccessModal
        isOpen={showSuccessModal}
        onClose={closeSuccessModal}
        customerEmail={formData.customer?.email ?? ""}
        selectedService={formData.selectedScope?.Name}
        selectedDate={selectedDateObj}
        selectedTime={selectedTime}
      />
    </div>
  )
}
