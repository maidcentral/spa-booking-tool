"use client"

import React, { useState, useEffect, memo, useCallback } from "react"
import { motion } from "framer-motion"
import { Check, Star, Clock, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { cn, formatCurrency } from "@/app/lib/utils"
import { useBooking } from "@/app/contexts/BookingContext"
import { useBookingData } from "@/app/hooks/useBookingData"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import type { ScopeGroup, Scope } from "@/app/services/api/booking-data"

export const ServiceSelection = memo(function ServiceSelection() {
  const { token } = useAuth()
  const { scopeGroups, loading: servicesLoading, error: servicesError } = useBookingData(token)
  const { formData, updateFormData } = useBooking()
  
  const [selectedScopeGroup, setSelectedScopeGroup] = useState<ScopeGroup | null>(
    formData.selectedScopeGroup || null
  )
  const [selectedScope, setSelectedScope] = useState<Scope | null>(
    formData.selectedScope || null
  )
  const handleScopeGroupSelect = useCallback((scopeGroup: ScopeGroup) => {
    setSelectedScopeGroup(scopeGroup)
    setSelectedScope(null)
    updateFormData({
      selectedScopeGroup: scopeGroup,
      selectedScope: null,
    })
  }, [updateFormData])

  const handleScopeSelect = useCallback((scope: Scope) => {
    setSelectedScope(scope)
    updateFormData({
      selectedScope: scope,
    })
  }, [updateFormData])


  // Helper function to check if a scope is a generic recurring service
  const isRecurringService = (scope: Scope) => {
    const name = scope.Name.toLowerCase()
    return name.includes('recurring') || 
           name.includes('service') && !name.includes('one-time') && !name.includes('initial')
  }

  // Auto-select single scopes for better UX
  useEffect(() => {
    if (selectedScopeGroup && selectedScopeGroup.Scopes?.length === 1) {
      const singleScope = selectedScopeGroup.Scopes[0]
      handleScopeSelect(singleScope)
    }
  }, [selectedScopeGroup])


  // Show loading state
  if (servicesLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-[30px] font-bold text-gray-900 mb-2">Choose Your Service</h2>
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
          <h2 className="text-[30px] font-bold text-gray-900 mb-2">Choose Your Service</h2>
          <p className="text-red-600">Error loading services: {servicesError}</p>
        </div>
      </div>
    )
  }

  // Show all scope groups from API
  const availableScopeGroups = scopeGroups
  const availableScopes = selectedScopeGroup?.Scopes || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-[30px] font-bold text-gray-900 mb-2">
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
                    "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
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
                  <p className="text-gray-600">No services are currently available for "{selectedScopeGroup.Name}"</p>
                  <p className="text-sm text-gray-500 mt-2">Please select a different service type.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {availableScopes.map((scope, index) => (
                  <motion.button
                    key={scope.ScopeId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleScopeSelect(scope)}
                    className={cn(
                      "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
                      selectedScope?.ScopeId === scope.ScopeId
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-gray-400 hover:border-blue-400 text-gray-800"
                    )}
                  >
                    {selectedScope?.ScopeId === scope.ScopeId && (
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
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </CardContent>
      </Card>

    </div>
  )
})