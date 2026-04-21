"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BookingProvider, useBooking } from "@/app/contexts/BookingContext"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import { BookingLayout } from "@/app/components/booking/BookingLayout"
import { ProgressIndicator } from "@/app/components/booking/ProgressIndicator"
import { StepContact } from "./StepContact"
import { StepHomeAndPricing } from "./StepHomeAndPricing"
import { StepSchedulingAndBooking } from "./StepSchedulingAndBooking"
import type {
  Frequency,
  QuestionData,
  RateModification,
} from "@/app/services/api/booking-data"
import { formatCurrency } from "@/app/lib/utils"
import { parseUtmFromSearch } from "@/app/lib/utm"
import { loadPersistedBooking, savePersistedBooking } from "@/app/lib/booking-storage"
import { track } from "@/app/lib/tracker"

const STEPS = [
  {
    id: "contact",
    title: "About you",
    description: "Contact & service",
    isCompleted: false,
    isActive: true,
  },
  {
    id: "home-pricing",
    title: "Home & pricing",
    description: "Customize & address",
    isCompleted: false,
    isActive: false,
  },
  {
    id: "scheduling",
    title: "Schedule & book",
    description: "Pick a time",
    isCompleted: false,
    isActive: false,
  },
]

function MultiStepBookingFlowInner() {
  const { isAuthenticated } = useAuth()
  const { formData, isPricingLoading, updateFormData } = useBooking()
  const [currentStep, setCurrentStep] = useState(0)

  // Cross-step state lifted from individual steps so the sidebar, the sticky
  // mobile bar, and the QuestionStepType routing can all see up-to-date values
  // regardless of which step is active. Multi-scope: per-scope records.
  const [frequencyByScope, setFrequencyByScope] = useState<Record<number, Frequency>>({})
  const [modsByScope, setModsByScope] = useState<Record<number, Record<number, number>>>({})
  const [selectedRateModifications, setSelectedRateModifications] = useState<RateModification[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [questionsUnavailable, setQuestionsUnavailable] = useState(false)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})

  // Flips true after the mount-time localStorage hydrate runs. Until it does,
  // we don't render the step components — otherwise the children would copy
  // the empty initial formData into local `useState` initializers and miss
  // the rehydrated values. Also guards the save effect from overwriting a
  // persisted payload with the blank initial state.
  const [hydrated, setHydrated] = useState(false)
  // Wall-clock timestamp when the current step was entered — subtracted on the
  // next step transition to emit a durationMs on booking_step_completed.
  const stepStartRef = useRef<number>(0)
  // Flips true after the first post-hydration render so the scroll-on-step-
  // change effect doesn't snap the page on the initial mount (when currentStep
  // is either 0 by default or rehydrated from localStorage).
  const firstStepRenderRef = useRef(true)

  // Scroll to top whenever the visitor moves between steps. Each step starts
  // with its own heading, so the visitor should see it — they just clicked
  // Continue/Back at the bottom of the previous step. Honour the visitor's
  // prefers-reduced-motion setting: fall back to instant scroll when the OS
  // asks us to avoid non-essential animation.
  useEffect(() => {
    if (firstStepRenderRef.current) {
      firstStepRenderRef.current = false
      return
    }
    if (typeof window === "undefined") return
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })
  }, [currentStep])

  const advanceStep = (next: number) => {
    const now = Date.now()
    const durationMs = stepStartRef.current ? now - stepStartRef.current : 0
    track({ type: "booking_step_completed", step: currentStep, durationMs })
    stepStartRef.current = now
    setCurrentStep(next)
  }

  // Mount: rehydrate from localStorage (if anything saved within the last 7d)
  // and capture utm_* from the URL. UTM overrides the persisted value so a
  // fresh campaign click doesn't stick to a stale attribution.
  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true)
      return
    }

    const persisted = loadPersistedBooking()
    if (persisted) {
      updateFormData(persisted.formData)
      setFrequencyByScope(persisted.frequencyByScope ?? {})
      setModsByScope(persisted.modsByScope ?? {})
      setQuestionAnswers(persisted.questionAnswers ?? {})
      setCurrentStep(persisted.currentStep ?? 0)
      setSelectedDate(persisted.selectedDate ?? null)
      setSelectedTime(persisted.selectedTime ?? "")
    }

    const utm = parseUtmFromSearch(window.location.search)
    if (Object.keys(utm).length > 0) {
      updateFormData({ utm })
    }

    stepStartRef.current = Date.now()
    track({ type: "booking_started" })
    // Setting hydrated last so every other state update from this effect is
    // batched with it; children mount in a single render with all values.
    setHydrated(true)
    // Intentionally fire once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced save. Only runs after hydration so an empty initial state can't
  // clobber a prior persisted payload.
  useEffect(() => {
    if (!hydrated) return
    const handle = setTimeout(() => {
      savePersistedBooking({
        formData: {
          selectedScopeGroup: formData.selectedScopeGroup,
          selectedScope: formData.selectedScope,
          selectedScopes: formData.selectedScopes,
          selectedFrequency: formData.selectedFrequency,
          zipCode: formData.zipCode,
          validatedPostalCode: formData.validatedPostalCode,
          customer: formData.customer,
          payment: formData.payment,
          customerSourceId: formData.customerSourceId,
          utm: formData.utm,
          smsConsentTransactional: formData.smsConsentTransactional,
          smsConsentMarketing: formData.smsConsentMarketing,
          leadId: formData.leadId,
          quoteId: formData.quoteId,
          scopeGroupId: formData.scopeGroupId,
        },
        frequencyByScope,
        modsByScope,
        questionAnswers,
        currentStep,
        selectedDate,
        selectedTime,
      })
    }, 500)
    return () => clearTimeout(handle)
  }, [
    hydrated,
    formData,
    frequencyByScope,
    modsByScope,
    questionAnswers,
    currentStep,
    selectedDate,
    selectedTime,
  ])

  const steps = STEPS.map((step, index) => ({
    ...step,
    isCompleted: index < currentStep,
    isActive: index === currentStep,
  }))

  if (!isAuthenticated || !hydrated) return null

  const goToStep = (index: number) => {
    if (index <= currentStep) advanceStep(index)
  }

  const zipCode = formData.validatedPostalCode?.PostalCode ?? formData.zipCode
  const selectedDateObj = selectedDate ? new Date(selectedDate) : undefined
  const showStickyTotal = formData.pricing.total > 0

  return (
    <BookingLayout
      pricing={formData.pricing}
      selectedService={formData.selectedScope?.Name}
      selectedDate={selectedDateObj}
      selectedTime={selectedTime}
      zipCode={zipCode}
      isPricingLoading={isPricingLoading}
      marketingText={formData.selectedScopeGroup?.MarketingText ?? undefined}
    >
      <ProgressIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={goToStep}
        className="mb-8"
      />

      <AnimatePresence mode="sync">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30, position: "absolute" }}
          transition={{ duration: 0.25 }}
          // Leave bottom space on mobile so the sticky total bar never overlaps
          // the Continue/Back buttons at the end of each step.
          className="pb-24 lg:pb-0"
        >
          {currentStep === 0 && (
            <StepContact
              questions={questions}
              onQuestionsLoaded={setQuestions}
              questionsUnavailable={questionsUnavailable}
              onQuestionsUnavailableChange={setQuestionsUnavailable}
              questionAnswers={questionAnswers}
              onQuestionAnswersChange={setQuestionAnswers}
              onCompleted={() => advanceStep(1)}
            />
          )}
          {currentStep === 1 && (
            <StepHomeAndPricing
              frequencyByScope={frequencyByScope}
              onFrequencyByScopeChange={setFrequencyByScope}
              modsByScope={modsByScope}
              onModsByScopeChange={setModsByScope}
              onRateModificationsLoaded={setSelectedRateModifications}
              questions={questions}
              questionsUnavailable={questionsUnavailable}
              questionAnswers={questionAnswers}
              onQuestionAnswersChange={setQuestionAnswers}
              onCompleted={() => advanceStep(2)}
              onBack={() => advanceStep(0)}
            />
          )}
          {currentStep === 2 && (
            <StepSchedulingAndBooking
              frequencyByScope={frequencyByScope}
              selectedRateModifications={selectedRateModifications}
              modsByScope={modsByScope}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              questions={questions}
              questionAnswers={questionAnswers}
              onQuestionAnswerChange={(id, answer) =>
                setQuestionAnswers(prev => ({ ...prev, [id]: answer }))
              }
              onBack={() => advanceStep(1)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mobile-only sticky total bar. The desktop sidebar shows the full
          PricingSummary, so this only renders below the lg breakpoint. */}
      {showStickyTotal && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg"
        >
          <div className="max-w-3xl mx-auto flex items-baseline justify-between">
            <span className="text-sm text-gray-600">
              {isPricingLoading ? "Calculating…" : "Running total"}
            </span>
            <span className="text-2xl font-semibold text-blue-600">
              {isPricingLoading ? "—" : formatCurrency(formData.pricing.total)}
            </span>
          </div>
        </motion.div>
      )}
    </BookingLayout>
  )
}

export function MultiStepBookingFlow() {
  return (
    <BookingProvider>
      <MultiStepBookingFlowInner />
    </BookingProvider>
  )
}
