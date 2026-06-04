"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/app/lib/utils"
import { PricingSummary } from "./PricingSummary"
import { BookingPricing } from "@/app/types/booking"

interface BookingLayoutProps {
  children: React.ReactNode
  pricing: BookingPricing
  selectedService?: string
  selectedDate?: Date
  selectedTime?: string
  zipCode?: string
  onCheckout?: () => void
  className?: string
  isPricingLoading?: boolean
}

export function BookingLayout({
  children,
  pricing,
  selectedService,
  selectedDate,
  selectedTime,
  zipCode,
  onCheckout,
  className,
  isPricingLoading
}: BookingLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Book Your Service
          </h1>
          <p className="text-gray-800">
            Get professional cleaning services with just a few clicks
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
          {/* Form Section - 75% width on desktop */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4 sm:space-y-8"
            >
              {children}
            </motion.div>
          </div>

          {/* Pricing Summary - 25% width on desktop */}
          <div className="hidden lg:block lg:col-span-4 relative">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky top-8 z-10"
            >
              <PricingSummary
                pricing={pricing}
                selectedService={selectedService}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                zipCode={zipCode}
                onCheckout={onCheckout}
                isPricingLoading={isPricingLoading}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}