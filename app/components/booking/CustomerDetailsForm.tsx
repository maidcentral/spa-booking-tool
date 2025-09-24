"use client"

import React, { memo, useState, useImperativeHandle, forwardRef } from "react"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { cn } from "@/app/lib/utils"

interface CustomerDetailsFormProps {
  initialValues: {
    firstName: string
    lastName: string
    email: string
    phone: string
    address1: string
    address2: string
    city: string
    state: string
  }
  postalCode: string
  errors?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    postalCode?: string
  }
  disabled?: boolean
}

export interface CustomerDetailsFormRef {
  getFormData: () => {
    firstName: string
    lastName: string
    email: string
    phone: string
    address1: string
    address2: string
    city: string
    state: string
  }
  validateForm: () => {
    isValid: boolean
    errors: Record<string, string>
  }
}

export const CustomerDetailsForm = memo(forwardRef<CustomerDetailsFormRef, CustomerDetailsFormProps>(function CustomerDetailsForm({
  initialValues,
  postalCode,
  errors = {},
  disabled = false
}, ref) {
  // Internal state for all form fields
  const [formData, setFormData] = useState(initialValues)

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getFormData: () => formData,
    validateForm: () => {
      const newErrors: Record<string, string> = {}

      if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required"
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required"
      }
      if (!formData.email.trim()) {
        newErrors.email = "Email is required"
      } else if (!validateEmail(formData.email)) {
        newErrors.email = "Please enter a valid email address"
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required"
      }
      if (!formData.address1.trim()) {
        newErrors.address1 = "Street address is required"
      }
      if (!formData.city.trim()) {
        newErrors.city = "City is required"
      }
      if (!formData.state.trim()) {
        newErrors.state = "State is required"
      }

      return {
        isValid: Object.keys(newErrors).length === 0,
        errors: newErrors
      }
    }
  }))

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, "")
    
    // Format as XXX-XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber
    } else if (phoneNumber.length <= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`
    } else {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits and basic characters while typing (no expensive formatting)
    const value = e.target.value.replace(/[^0-9-]/g, '')
    if (value.length <= 12) { // Limit length during typing
      updateField("phone", value)
    }
  }

  const handlePhoneBlur = () => {
    // Format phone number only when user finishes typing
    const formatted = formatPhoneNumber(formData.phone)
    updateField("phone", formatted)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {/* First Name */}
        <div>
          <Label htmlFor="firstName" variant="required">
            First Name
          </Label>
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            placeholder="Enter your first name"
            className={cn(
              "mt-1 sm:mt-2",
              errors.firstName && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.firstName && (
            <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="lastName" variant="required">
            Last Name
          </Label>
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            placeholder="Enter your last name"
            className={cn(
              "mt-1 sm:mt-2",
              errors.lastName && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.lastName && (
            <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" variant="required">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="your@email.com"
            className={cn(
              "mt-1 sm:mt-2",
              errors.email && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" variant="required">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            placeholder="555-555-5555"
            className={cn(
              "mt-1 sm:mt-2",
              errors.phone && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Address Fields - Full width section */}
      <div className="space-y-3 sm:space-y-6">
        {/* Street Address */}
        <div>
          <Label htmlFor="address1" variant="required">
            Street Address
          </Label>
          <Input
            id="address1"
            type="text"
            value={formData.address1}
            onChange={(e) => updateField("address1", e.target.value)}
            placeholder="123 Main Street"
            className={cn(
              "mt-1 sm:mt-2",
              errors.address1 && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.address1 && (
            <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.address1}</p>
          )}
        </div>

        {/* Apartment/Suite */}
        <div>
          <Label htmlFor="address2">
            Apartment, Suite, Unit (Optional)
          </Label>
          <Input
            id="address2"
            type="text"
            value={formData.address2}
            onChange={(e) => updateField("address2", e.target.value)}
            placeholder="Apt 4B"
            className="mt-1 sm:mt-2"
            disabled={disabled}
          />
        </div>

        {/* City and State Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          {/* City */}
          <div className="md:col-span-2">
            <Label htmlFor="city" variant="required">
              City
            </Label>
            <Input
              id="city"
              type="text"
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="New York"
              className={cn(
                "mt-1 sm:mt-2",
                errors.city && "border-red-500"
              )}
              disabled={disabled}
              required
            />
            {errors.city && (
              <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.city}</p>
            )}
          </div>

          {/* State */}
          <div>
            <Label htmlFor="state" variant="required">
              State
            </Label>
            <Input
              id="state"
              type="text"
              value={formData.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder="NY"
              maxLength={2}
              className={cn(
                "mt-1 sm:mt-2",
                errors.state && "border-red-500"
              )}
              disabled={disabled}
              required
            />
            {errors.state && (
              <p className="text-sm text-red-600 mt-0.5 sm:mt-1">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Postal Code (Read-only, populated from service location) */}
        <div>
          <Label htmlFor="postalCode">
            Service Postal Code
          </Label>
          <Input
            id="postalCode"
            type="text"
            value={postalCode}
            readOnly
            className="mt-1 sm:mt-2 bg-gray-50"
            placeholder="Will be populated from service location"
          />
          <p className="text-sm text-gray-500 mt-0.5 sm:mt-1">
            Automatically populated from your service location
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-2 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          Your information will be used to create your service booking and send you confirmation details.
          We respect your privacy and will not share your information with third parties.
        </p>
      </div>
    </div>
  )
}))