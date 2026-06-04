"use client"

import React from "react"
import { motion } from "framer-motion"
import { Check, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { cn } from "@/app/lib/utils"
import type { RateModification } from "@/app/services/api/booking-data"

interface RateModsPickerProps {
  rateModifications: RateModification[]
  selectedQuantities: Record<number, number>
  onToggle: (rateModificationId: number, nextQuantity: number) => void
}

export function RateModsPicker({
  rateModifications,
  selectedQuantities,
  onToggle,
}: RateModsPickerProps) {
  if (rateModifications.length === 0) return null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add-on Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {rateModifications.map(modification => {
              const isSelected = (selectedQuantities[modification.RateModificationId] ?? 0) > 0
              const isRequired = modification.IsRequired
              return (
                <button
                  key={modification.RateModificationId}
                  type="button"
                  onClick={() => onToggle(modification.RateModificationId, isSelected ? 0 : 1)}
                  disabled={isRequired}
                  className={cn(
                    "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-400 hover:border-blue-400 text-gray-800",
                    isRequired && "cursor-default"
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
                    <h4 className="font-medium text-gray-900 leading-tight">{modification.Name}</h4>
                    <p className="text-sm font-medium text-green-600">{modification.CostDisplay}</p>
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
  )
}
