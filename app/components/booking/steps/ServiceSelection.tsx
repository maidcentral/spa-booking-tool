"use client"

import React, { useCallback, useEffect, memo } from "react"
import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { cn } from "@/app/lib/utils"
import { useBooking } from "@/app/contexts/BookingContext"
import { useBookingData } from "@/app/hooks/useBookingData"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import type { ScopeGroup, Scope } from "@/app/services/api/booking-data"

interface ServiceSelectionProps {
  /** When true, visitors can select multiple scopes within the chosen group.
   *  Matches MaidCentral's built-in form behaviour. Defaults to false for
   *  the single-page flow. */
  multiple?: boolean
}

/**
 * Stateless service picker — reads selected scope group + scopes from
 * BookingContext and writes selection changes back through `updateFormData`.
 *
 * Intentionally NO local mirror state: an earlier version kept
 * `selectedScopes` in `useState` and called `updateFormData` inside a
 * `setSelectedScopes(prev => ...)` updater. React 19 flags that as
 * "setState during another component's render" because updater functions
 * can run during render. Reading from context directly keeps the data flow
 * clean and makes rehydrated-from-localStorage state show up immediately.
 */
export const ServiceSelection = memo(function ServiceSelection({
  multiple = false,
}: ServiceSelectionProps) {
  const { token } = useAuth()
  const { scopeGroups, loading: servicesLoading, error: servicesError } = useBookingData(token)
  const { formData, updateFormData } = useBooking()

  const selectedScopeGroup: ScopeGroup | null = formData.selectedScopeGroup ?? null
  const selectedScopes: Scope[] = formData.selectedScopes ?? []

  const handleScopeGroupSelect = useCallback(
    (scopeGroup: ScopeGroup) => {
      // Picking a new group drops any scope selections from the old one.
      updateFormData({
        selectedScopeGroup: scopeGroup,
        selectedScope: undefined,
        selectedScopes: [],
      })
    },
    [updateFormData]
  )

  const handleScopeSelect = useCallback(
    (scope: Scope) => {
      const prev = formData.selectedScopes ?? []
      let next: Scope[]
      if (multiple) {
        const already = prev.some(s => s.ScopeId === scope.ScopeId)
        next = already ? prev.filter(s => s.ScopeId !== scope.ScopeId) : [...prev, scope]
      } else {
        next = [scope]
      }
      updateFormData({
        // Mirror the first entry to the legacy singular field so the
        // sidebar badge and the single-page flow keep rendering something.
        selectedScope: next[0],
        selectedScopes: next,
      })
    },
    [multiple, updateFormData, formData.selectedScopes]
  )

  const isRecurringService = (scope: Scope) => {
    const name = scope.Name.toLowerCase()
    return (
      name.includes("recurring") ||
      (name.includes("service") && !name.includes("one-time") && !name.includes("initial"))
    )
  }

  // Auto-select when a scope group has exactly one scope option. Depends on
  // the group ID so the effect only fires when the visitor actually switches
  // groups — not on every re-render.
  const scopeGroupId = selectedScopeGroup?.ScopeGroupId
  useEffect(() => {
    if (!selectedScopeGroup || selectedScopeGroup.Scopes?.length !== 1) return
    const singleScope = selectedScopeGroup.Scopes[0]
    const alreadySelected = (formData.selectedScopes ?? []).some(
      s => s.ScopeId === singleScope.ScopeId
    )
    if (!alreadySelected) {
      handleScopeSelect(singleScope)
    }
    // Intentionally depend on the group ID, not the scopes array or
    // `handleScopeSelect` — rerunning when the scope array changes would
    // fight the user every time they deselected the auto-picked scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeGroupId])

  // Show loading state
  if (servicesLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">Choose Your Service</h2>
          <p className="text-gray-600">Loading available services...</p>
        </div>
        <div className="flex justify-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      </div>
    )
  }

  // Show error state
  if (servicesError) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">Choose Your Service</h2>
          <p className="text-red-600">Error loading services: {servicesError}</p>
        </div>
      </div>
    )
  }

  const availableScopeGroups = scopeGroups
  const availableScopes = selectedScopeGroup?.Scopes || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-[24px] sm:text-[30px] font-bold text-gray-900 mb-1 sm:mb-2">
          Choose Your Service
        </h2>
        <p className="text-gray-600">
          Select the type of cleaning service you need
        </p>
      </div>

      {/* Hierarchical Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Your Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Service Type (Scope Group) */}
          <div>
            <Label htmlFor="scopeGroup" className="text-base font-medium">Service Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {availableScopeGroups.map((scopeGroup, index) => (
                <motion.button
                  key={scopeGroup.ScopeGroupId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleScopeGroupSelect(scopeGroup)}
                  className={cn(
                    "relative p-4 text-sm rounded-lg border-2 hover:shadow-sm text-left",
                    selectedScopeGroup?.ScopeGroupId === scopeGroup.ScopeGroupId
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-400 hover:border-blue-400 text-gray-800"
                  )}
                >
                  {selectedScopeGroup?.ScopeGroupId === scopeGroup.ScopeGroupId && (
                    <div className="absolute top-2 right-2">
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}

                  <h3 className="font-medium text-gray-900 mb-1 leading-tight">
                    {scopeGroup.Name}
                  </h3>

                  <p className="text-xs text-gray-700">
                    {scopeGroup.Scopes?.length === 0 ? 'No services available' :
                     scopeGroup.Scopes?.length === 1 ? '1 service available' :
                     `${scopeGroup.Scopes?.length || 0} services available`}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Step 2: Specific Service (Scope) */}
          {selectedScopeGroup && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Label className="text-base font-medium">Choose Service</Label>

              {/* Empty state message */}
              {availableScopes.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg mt-2">
                  <p className="text-gray-600">No services are currently available for &ldquo;{selectedScopeGroup.Name}&rdquo;</p>
                  <p className="text-sm text-gray-500 mt-2">Please select a different service type.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {availableScopes.map((scope, index) => {
                    const isSelected = selectedScopes.some(s => s.ScopeId === scope.ScopeId)
                    return (
                      <motion.button
                        key={scope.ScopeId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleScopeSelect(scope)}
                        className={cn(
                          "relative p-4 text-sm rounded-lg border-2 hover:shadow-sm text-left",
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

                        <h3 className="font-medium text-gray-900 mb-1 leading-tight">
                          {isRecurringService(scope) ? selectedScopeGroup.Name : scope.Name}
                        </h3>

                        {isRecurringService(scope) && (
                          <p className="text-xs text-blue-600 mb-2">
                            Recurring service options
                          </p>
                        )}

                        {scope.IsRequired && (
                          <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                            Required
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

        </CardContent>
      </Card>
    </div>
  )
})
