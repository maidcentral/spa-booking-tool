"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { User, MapPin, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/app/lib/utils"
import { useBooking } from "@/app/contexts/BookingContext"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import { bookingDataService, type PostalCodeResult } from "@/app/services/api/booking-data"
import { leadService } from "@/app/services/api/lead"
import type { LeadCreateRequest } from "@/app/types/api/lead"

interface StepContactProps {
  onCompleted: () => void
}

interface ContactFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  zipCode: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function StepContact({ onCompleted }: StepContactProps) {
  const { token } = useAuth()
  const { formData, updateFormData } = useBooking()

  const [values, setValues] = useState<ContactFormState>({
    firstName: formData.customer?.firstName ?? "",
    lastName: formData.customer?.lastName ?? "",
    email: formData.customer?.email ?? "",
    phone: formData.customer?.phone ?? "",
    zipCode: formData.zipCode ?? "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({})
  const [validatedPostalCode, setValidatedPostalCode] = useState<PostalCodeResult | null>(
    formData.validatedPostalCode ?? null
  )
  const [postalCodeError, setPostalCodeError] = useState("")
  const [postalCodeLoading, setPostalCodeLoading] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = (name: keyof ContactFormState, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
    // Typing a new ZIP invalidates any prior validation.
    if (name === "zipCode" && validatedPostalCode && value !== validatedPostalCode.PostalCode) {
      setValidatedPostalCode(null)
      setPostalCodeError("")
    }
  }

  const validateContactFields = (): boolean => {
    const next: Partial<Record<keyof ContactFormState, string>> = {}
    if (!values.firstName.trim()) next.firstName = "Required"
    if (!values.lastName.trim()) next.lastName = "Required"
    if (!values.email.trim()) next.email = "Required"
    else if (!EMAIL_RE.test(values.email.trim())) next.email = "Not a valid email"
    if (!values.phone.replace(/\D/g, "")) next.phone = "Required"
    else if (values.phone.replace(/\D/g, "").length < 10) next.phone = "Enter at least 10 digits"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleValidateZip = async () => {
    setPostalCodeError("")
    const trimmed = values.zipCode.trim()
    if (!trimmed) {
      setPostalCodeError("Please enter a postal code")
      return
    }
    if (!token) {
      setPostalCodeError("Authentication not ready. Please refresh and try again.")
      return
    }

    setPostalCodeLoading(true)
    try {
      const response = await bookingDataService.getPostalCodes(token)
      const match = response.Result.find(pc => pc.PostalCode === trimmed)
      if (match) {
        setValidatedPostalCode(match)
      } else {
        setValidatedPostalCode(null)
        setPostalCodeError("Service not available in this area")
      }
    } catch (err: any) {
      setPostalCodeError(err?.message || "Could not validate postal code")
    } finally {
      setPostalCodeLoading(false)
    }
  }

  const handleContinue = async () => {
    setSubmissionError("")
    const contactOk = validateContactFields()
    if (!validatedPostalCode) {
      setPostalCodeError("Please validate your postal code before continuing")
    }
    if (!contactOk || !validatedPostalCode) return
    if (!token) {
      setSubmissionError("Authentication not ready. Please refresh and try again.")
      return
    }

    setIsSubmitting(true)
    try {
      const leadData: LeadCreateRequest = {
        LeadId: formData.leadId,
        FirstName: values.firstName.trim(),
        LastName: values.lastName.trim(),
        Email: values.email.trim(),
        Phone: values.phone.replace(/\D/g, ""),
        PostalCode: validatedPostalCode.PostalCode,
      }

      const leadResponse = await leadService.createOrUpdate(token, leadData)
      const leadId = leadResponse.Result?.LeadId ?? leadResponse.LeadId

      if (!leadResponse.IsSuccess || !leadId) {
        setSubmissionError(
          leadResponse.Message || leadResponse.ErrorMessage || "Failed to save your contact info"
        )
        return
      }

      updateFormData({
        leadId,
        zipCode: validatedPostalCode.PostalCode,
        validatedPostalCode,
        customer: {
          ...formData.customer,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.replace(/\D/g, ""),
        },
      })

      onCompleted()
    } catch (err: any) {
      setSubmissionError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[30px] font-bold text-gray-900 mb-2">About you</h2>
        <p className="text-gray-600">
          We&rsquo;ll use these details to confirm your booking and check that we service your area.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact information
              </div>
              {formData.leadId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-xs text-green-600 font-normal"
                >
                  <Check className="w-3 h-3" />
                  Saved
                </motion.div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" variant="required">First name</Label>
                <Input
                  id="firstName"
                  value={values.firstName}
                  onChange={e => setField("firstName", e.target.value)}
                  className={cn("mt-2", errors.firstName && "border-red-500")}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" variant="required">Last name</Label>
                <Input
                  id="lastName"
                  value={values.lastName}
                  onChange={e => setField("lastName", e.target.value)}
                  className={cn("mt-2", errors.lastName && "border-red-500")}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="email" variant="required">Email</Label>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={e => setField("email", e.target.value)}
                className={cn("mt-2", errors.email && "border-red-500")}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone" variant="required">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={values.phone}
                onChange={e => setField("phone", e.target.value)}
                className={cn("mt-2", errors.phone && "border-red-500")}
                aria-invalid={!!errors.phone}
                placeholder="(555) 555-5555"
              />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Service area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="zipCode" variant="required">Postal code</Label>
            <div className="flex gap-2 sm:gap-3 mt-2">
              <Input
                id="zipCode"
                value={values.zipCode}
                onChange={e => setField("zipCode", e.target.value)}
                placeholder="29406"
                className={cn("max-w-xs", postalCodeError && "border-red-500")}
                aria-invalid={!!postalCodeError}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleValidateZip}
                disabled={postalCodeLoading}
              >
                {postalCodeLoading ? "Checking…" : "Validate"}
              </Button>
            </div>
            {postalCodeError && <p className="text-sm text-red-600 mt-1">{postalCodeError}</p>}
            {validatedPostalCode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <p className="text-sm text-green-800">
                  ✓ Service available in {validatedPostalCode.ZoneName} zone
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {submissionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submissionError}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleContinue} disabled={isSubmitting} size="lg">
          {isSubmitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  )
}
