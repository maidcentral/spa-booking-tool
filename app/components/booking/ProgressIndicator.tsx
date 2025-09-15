"use client"

import React from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/app/lib/utils"
import { BookingStep } from "@/app/types/booking"

interface ProgressIndicatorProps {
  steps: BookingStep[]
  currentStep: number
  onStepClick?: (stepIndex: number) => void
  className?: string
}

export function ProgressIndicator({
  steps,
  currentStep,
  onStepClick,
  className
}: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Progress Bar */}
      <div className="md:hidden mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="bg-blue-600 h-2 rounded-full"
          />
        </div>
        <div className="mt-2">
          <h3 className="font-medium text-gray-900">{steps[currentStep]?.title}</h3>
          <p className="text-sm text-gray-600">{steps[currentStep]?.description}</p>
        </div>
      </div>

      {/* Desktop Step Indicator */}
      <div className="hidden md:block">
        <nav aria-label="Progress">
          <ol className="flex items-start justify-between">
            {steps.map((step, stepIdx) => (
              <li key={step.id} className="relative flex-1">
                
                <button
                  onClick={() => onStepClick?.(stepIdx)}
                  disabled={!onStepClick || stepIdx > currentStep}
                  className={cn(
                    "relative flex flex-col items-center group",
                    onStepClick && stepIdx <= currentStep && "cursor-pointer hover:opacity-80",
                    (!onStepClick || stepIdx > currentStep) && "cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                      stepIdx < currentStep
                        ? "bg-blue-600 border-blue-600 text-white"
                        : stepIdx === currentStep
                        ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-white border-gray-300 text-gray-500"
                    )}
                  >
                    {stepIdx < currentStep ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <span className="text-sm font-medium">{stepIdx + 1}</span>
                    )}
                  </div>
                  
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        stepIdx <= currentStep ? "text-blue-600" : "text-gray-500"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-32">
                      {step.description}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
}