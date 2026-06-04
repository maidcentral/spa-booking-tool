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
  QuoteRateModification,
  QuoteScopeOfWork,
} from "@/app/types/api/lead"
import { QuestionsForm } from "@/app/components/booking/pickers/QuestionsForm"
import { filterQuestionsForStep } from "./questionStep"
import type {
  BookQuoteRequest,
  ScopeOfWork as BookQuoteScopeOfWork,
  RateModification as BookQuoteRateMod,
} from "@/app/types/api/bookquote"
import { CardConnectTokenizer } from "@/app/components/booking/CardConnectTokenizer"
import { BookingSuccessModal } from "@/app/components/booking/BookingSuccessModal"

interface StepSchedulingAndBookingProps {
  selectedFrequency: Frequency | null
  selectedRateModifications: RateModification[]
  selectedModifications: Record<number, number>
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

export function StepSchedulingAndBooking({
  selectedFrequency,
  selectedRateModifications,
  selectedModifications,
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

  const scopeGroupId = formData.selectedScopeGroup?.ScopeGroupId

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
        2,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeGroupId])

  const canBook =
    !!token &&
    !!formData.leadId &&
    !!formData.quoteId &&
    !!formData.selectedScope &&
    !!formData.selectedScopeGroup &&
    !!selectedFrequency &&
    !!selectedDate &&
    !!selectedTime &&
    !!paymentToken &&
    !!paymentExpiry &&
    allRequiredAfterPricingAnswered

  const handleBookNow = async () => {
    setSubmissionError("")
    if (
      !canBook ||
      !token ||
      !formData.leadId ||
      !formData.quoteId ||
      !formData.selectedScope ||
      !formData.selectedScopeGroup ||
      !selectedFrequency ||
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

      // Persist any "After Pricing" question answers onto the quote before booking.
      // The quote was initially saved at the end of Step 2 (before these were answered).
      if (afterPricingQuestions.length > 0) {
        const quoteRateMods: QuoteRateModification[] = Object.entries(selectedModifications)
          .filter(([, quantity]) => quantity > 0)
          .map(([modId, quantity]) => {
            const id = parseInt(modId)
            const rateMod = selectedRateModifications.find(r => r.RateModificationId === id)
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

        const quoteScopesOfWork: QuoteScopeOfWork[] = [
          {
            ScopeOfWorkId: formData.selectedScope.ScopeId,
            FrequencyId: selectedFrequency.FrequencyId,
            RateModifications: quoteRateMods,
          },
        ]

        const quoteUpdate: QuoteCreateRequest = {
          LeadId: formData.leadId,
          QuoteId: formData.quoteId,
          HomeAddress1: address1,
          HomeCity: city,
          HomeRegion: region,
          HomePostalCode: postalCode,
          BillingAddress1: address1,
          BillingCity: city,
          BillingRegion: region,
          BillingPostalCode: postalCode,
          SendQuoteEmail: false,
          AddToCampaigns: true,
          TriggerWebhook: true,
          ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
          ScopesOfWork: quoteScopesOfWork,
          Questions: quoteQuestions,
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

      const bookingRateMods: BookQuoteRateMod[] = Object.entries(selectedModifications)
        .filter(([, quantity]) => quantity > 0)
        .map(([modId, quantity]) => {
          const id = parseInt(modId)
          const rateMod = selectedRateModifications.find(r => r.RateModificationId === id)
          const isFrequencyRecurring = selectedFrequency.FrequencyId !== "S"
          return {
            RateModificationId: id,
            Quantity: quantity,
            IsRecurring: isFrequencyRecurring && rateMod?.IsRecurring === true,
          }
        })

      const scopesOfWork: BookQuoteScopeOfWork[] = [
        {
          ScopeOfWorkId: formData.selectedScope.ScopeId,
          FrequencyId: selectedFrequency.FrequencyId,
          FirstJobDate: firstJobDate,
          // Pre-adjustment CalculatedBaseCost. The server re-applies RateModifications,
          // so passing AdjustedBaseCost here would double-count.
          BaseFee: formData.pricing.baseFee || 0,
          RateModifications: bookingRateMods.length > 0 ? bookingRateMods : undefined,
        },
      ]

      const bookingRequest: BookQuoteRequest = {
        SendBookedEmail: false,
        SendCustomerPortalInvite: false,
        TriggerWebhook: false,
        LeadId: formData.leadId,
        QuoteId: formData.quoteId,
        Expiry: paymentExpiry,
        Token: paymentToken,
        ScopeGroupId: formData.selectedScopeGroup.ScopeGroupId,
        ScopesOfWork: scopesOfWork,
        HomeAddress1: address1,
        HomeCity: city,
        HomeRegion: region,
        HomePostalCode: postalCode,
        CustomerBillingAddress1: address1,
        CustomerBillingCity: city,
        CustomerBillingRegion: region,
        CustomerBillingPostalCode: postalCode,
      }

      const response = await bookQuoteService.bookQuote(token, bookingRequest)
      if (!response.success) {
        setSubmissionError(response.error || "Booking failed")
        return
      }

      setShowSuccessModal(true)
    } catch (err: any) {
      setSubmissionError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
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

      {selectedDate && selectedTime && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <CardConnectTokenizer
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

      {submissionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submissionError}
        </div>
      )}

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
