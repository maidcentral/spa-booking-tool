"use client"

import React, { useState } from "react"
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

const STEPS = [
  {
    id: "contact",
    title: "About you",
    description: "Contact details",
    isCompleted: false,
    isActive: true,
  },
  {
    id: "home-pricing",
    title: "Home & pricing",
    description: "Service and quote",
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
  const { formData, isPricingLoading } = useBooking()
  const [currentStep, setCurrentStep] = useState(0)

  // Cross-step state lifted from individual steps so the sidebar, the sticky
  // mobile bar, and the QuestionStepType routing can all see up-to-date values
  // regardless of which step is active.
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(null)
  const [selectedModifications, setSelectedModifications] = useState<Record<number, number>>({})
  const [selectedRateModifications, setSelectedRateModifications] = useState<RateModification[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [questionsUnavailable, setQuestionsUnavailable] = useState(false)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})

  const steps = STEPS.map((step, index) => ({
    ...step,
    isCompleted: index < currentStep,
    isActive: index === currentStep,
  }))

  if (!isAuthenticated) return null

  const goToStep = (index: number) => {
    if (index <= currentStep) setCurrentStep(index)
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
            <StepContact onCompleted={() => setCurrentStep(1)} />
          )}
          {currentStep === 1 && (
            <StepHomeAndPricing
              selectedFrequency={selectedFrequency}
              onFrequencyChange={setSelectedFrequency}
              selectedModifications={selectedModifications}
              onModificationsChange={setSelectedModifications}
              onRateModificationsLoaded={setSelectedRateModifications}
              questions={questions}
              onQuestionsLoaded={setQuestions}
              questionsUnavailable={questionsUnavailable}
              onQuestionsUnavailableChange={setQuestionsUnavailable}
              questionAnswers={questionAnswers}
              onQuestionAnswersChange={setQuestionAnswers}
              onCompleted={() => setCurrentStep(2)}
              onBack={() => setCurrentStep(0)}
            />
          )}
          {currentStep === 2 && (
            <StepSchedulingAndBooking
              selectedFrequency={selectedFrequency ?? formData.selectedFrequency ?? null}
              selectedRateModifications={selectedRateModifications}
              selectedModifications={selectedModifications}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              questions={questions}
              questionAnswers={questionAnswers}
              onQuestionAnswerChange={(id, answer) =>
                setQuestionAnswers(prev => ({ ...prev, [id]: answer }))
              }
              onBack={() => setCurrentStep(1)}
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
