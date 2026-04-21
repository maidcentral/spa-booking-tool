"use client"

import React from "react"
import { motion } from "framer-motion"
import { Check, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { cn } from "@/app/lib/utils"
import type { Frequency } from "@/app/services/api/booking-data"

const SAVINGS_BADGES: Record<string, { label: string; className: string }> = {
  E1: { label: "15% Savings", className: "bg-green-100 text-green-800" },
  E2: { label: "10% Savings", className: "bg-blue-100 text-blue-800" },
}

interface FrequencyPickerProps {
  frequencies: Frequency[]
  selectedFrequencyId: string | null
  onChange: (frequency: Frequency) => void
}

export function FrequencyPicker({ frequencies, selectedFrequencyId, onChange }: FrequencyPickerProps) {
  if (frequencies.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Service Frequency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          {frequencies.map((frequency, index) => {
            const isSelected = selectedFrequencyId === frequency.FrequencyId
            const badge = SAVINGS_BADGES[frequency.FrequencyId]
            return (
              <motion.button
                key={frequency.FrequencyId}
                type="button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onChange(frequency)}
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
                <h3 className="font-medium text-gray-900 mb-1 leading-tight">{frequency.Name}</h3>
                {badge && (
                  <span className={cn("inline-block text-xs px-2 py-1 rounded-full", badge.className)}>
                    {badge.label}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
