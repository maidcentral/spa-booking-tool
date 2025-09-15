"use client"

import React from "react"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { cn } from "@/app/lib/utils"

interface CustomerDetailsFormProps {
  firstName: string
  lastName: string
  email: string
  phone: string
  postalCode: string
  onFieldChange: (field: string, value: string) => void
  errors?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    postalCode?: string
  }
  disabled?: boolean
}

export function CustomerDetailsForm({
  firstName,
  lastName,
  email,
  phone,
  postalCode,
  onFieldChange,
  errors = {},
  disabled = false
}: CustomerDetailsFormProps) {
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
    const formatted = formatPhoneNumber(e.target.value)
    onFieldChange("phone", formatted)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      onFieldChange("emailError", "Please enter a valid email address")
    } else {
      onFieldChange("emailError", "")
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <Label htmlFor="firstName" variant="required">
            First Name
          </Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => onFieldChange("firstName", e.target.value)}
            placeholder="Enter your first name"
            className={cn(
              "mt-2",
              errors.firstName && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.firstName && (
            <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
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
            value={lastName}
            onChange={(e) => onFieldChange("lastName", e.target.value)}
            placeholder="Enter your last name"
            className={cn(
              "mt-2",
              errors.lastName && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.lastName && (
            <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
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
            value={email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="your@email.com"
            className={cn(
              "mt-2",
              errors.email && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email}</p>
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
            value={phone}
            onChange={handlePhoneChange}
            placeholder="555-555-5555"
            className={cn(
              "mt-2",
              errors.phone && "border-red-500"
            )}
            disabled={disabled}
            required
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
          )}
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
            className="mt-2 bg-gray-50"
            placeholder="Will be populated from service location"
          />
          <p className="text-sm text-gray-500 mt-1">
            Automatically populated from your service location
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          Your information will be used to create your service booking and send you confirmation details.
          We respect your privacy and will not share your information with third parties.
        </p>
      </div>
    </div>
  )
}