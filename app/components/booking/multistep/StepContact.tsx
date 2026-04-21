"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, MapPin, Check, MessageSquare, Megaphone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Button } from "@/app/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { cn } from "@/app/lib/utils"
import { useBooking } from "@/app/contexts/BookingContext"
import { useAuth } from "@/app/components/booking/AuthenticationProvider"
import {
  bookingDataService,
  type PostalCodeResult,
  type QuestionData,
} from "@/app/services/api/booking-data"
import { leadService } from "@/app/services/api/lead"
import type { CustomerSource, LeadCreateRequest } from "@/app/types/api/lead"
import { utmToApiFields } from "@/app/lib/utm"
import { ServiceSelection } from "@/app/components/booking/steps/ServiceSelection"
import { QuestionsForm } from "@/app/components/booking/pickers/QuestionsForm"
import { ApiErrorBanner } from "@/app/components/booking/ApiErrorBanner"
import { filterQuestionsForStep } from "./questionStep"

interface StepContactProps {
  questions: QuestionData[]
  onQuestionsLoaded: (questions: QuestionData[]) => void
  questionsUnavailable: boolean
  onQuestionsUnavailableChange: (unavailable: boolean) => void
  questionAnswers: Record<number, string>
  onQuestionAnswersChange: (
    value:
      | Record<number, string>
      | ((prev: Record<number, string>) => Record<number, string>)
  ) => void
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

// Partner-provided compliance links. Both are optional — the footer sentence
// only renders when at least one is set, and a link only renders for the
// specific URL that was configured. Links open in a new tab so the visitor
// doesn't lose their in-progress form.
const TERMS_URL = process.env.NEXT_PUBLIC_TERMS_URL?.trim() || ""
const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() || ""
const SHOW_COMPLIANCE_LINKS = TERMS_URL !== "" || PRIVACY_URL !== ""

export function StepContact({
  questions,
  onQuestionsLoaded,
  questionsUnavailable,
  onQuestionsUnavailableChange,
  questionAnswers,
  onQuestionAnswersChange,
  onCompleted,
}: StepContactProps) {
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
  // When the entered ZIP isn't in service but is a well-formed value, we don't
  // want to block the form — we want to capture the lead anyway so the Partner
  // can follow up if coverage expands. Matches MaidCentral's built-in form.
  const [postalCodeOutsideArea, setPostalCodeOutsideArea] = useState(false)
  const [submissionError, setSubmissionError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [outsideAreaSubmitted, setOutsideAreaSubmitted] = useState(false)
  const [smsConsentTransactional, setSmsConsentTransactional] = useState(
    formData.smsConsentTransactional
  )
  const [smsConsentMarketing, setSmsConsentMarketing] = useState(formData.smsConsentMarketing)
  const [consentError, setConsentError] = useState("")
  const [scopeError, setScopeError] = useState("")
  const [questionsError, setQuestionsError] = useState("")

  // Customer source picker. Optional field — if the API call fails we just hide
  // the control rather than block the form.
  const [customerSources, setCustomerSources] = useState<CustomerSource[]>([])
  const [customerSourceId, setCustomerSourceId] = useState<number | null>(
    formData.customerSourceId ?? null
  )
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  const scopeGroupId = formData.selectedScopeGroup?.ScopeGroupId
  const selectedScopes = formData.selectedScopes
  const scopeIdsKey = selectedScopes.map(s => s.ScopeId).sort((a, b) => a - b).join(",")

  // One-shot customer source fetch. Non-fatal — hides the picker on failure.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    leadService
      .getCustomerSources(token)
      .then(list => {
        if (!cancelled) setCustomerSources(list ?? [])
      })
      .catch(() => {
        if (!cancelled) setCustomerSources([])
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // Load questions for every selected scope. The parent owns the state so
  // Step 2 + Step 3 filter the same list into during- / after-pricing buckets
  // without refetching. scopeIdsKey is a stable string so the effect doesn't
  // fire on every render just because `selectedScopes` has a new reference.
  useEffect(() => {
    if (!token || scopeIdsKey === "") return
    const scopeIds = scopeIdsKey.split(",").map(n => parseInt(n, 10))

    let cancelled = false
    setLoadingQuestions(true)
    setQuestionsError("")

    bookingDataService
      .getQuestions(token, scopeIds)
      .then(res => {
        if (cancelled) return
        if (res.IsSuccess === false) {
          onQuestionsLoaded([])
          onQuestionsUnavailableChange(true)
        } else {
          onQuestionsLoaded(res.Result ?? [])
          onQuestionsUnavailableChange(false)
        }
      })
      .catch(() => {
        if (cancelled) return
        onQuestionsLoaded([])
        onQuestionsUnavailableChange(true)
      })
      .finally(() => {
        if (!cancelled) setLoadingQuestions(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scopeIdsKey])

  const setField = (name: keyof ContactFormState, value: string) => {
    setValues(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }))
    if (name === "zipCode" && validatedPostalCode && value !== validatedPostalCode.PostalCode) {
      setValidatedPostalCode(null)
      setPostalCodeError("")
      setPostalCodeOutsideArea(false)
    }
    if (name === "zipCode" && postalCodeOutsideArea) {
      // Re-entering the ZIP discards the "outside area" finding so a re-check runs.
      setPostalCodeOutsideArea(false)
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

  const runZipValidation = async (value: string): Promise<PostalCodeResult | null> => {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (!token) {
      setPostalCodeError("Authentication not ready. Please refresh and try again.")
      return null
    }

    setPostalCodeError("")
    setPostalCodeOutsideArea(false)
    setPostalCodeLoading(true)
    try {
      const response = await bookingDataService.getPostalCodes(token)
      const match = response.Result.find(pc => pc.PostalCode === trimmed)
      if (match) {
        setValidatedPostalCode(match)
        return match
      } else {
        // Soft-fail: the ZIP isn't served, but the visitor typed something
        // real. Don't block Continue — we'll still capture the lead.
        setValidatedPostalCode(null)
        setPostalCodeOutsideArea(true)
        return null
      }
    } catch (err: any) {
      setPostalCodeError(err?.message || "Could not validate postal code")
      return null
    } finally {
      setPostalCodeLoading(false)
    }
  }

  const handleZipBlur = () => {
    const trimmed = values.zipCode.trim()
    if (!trimmed) return
    if (validatedPostalCode?.PostalCode === trimmed) return
    void runZipValidation(trimmed)
  }

  const setQuestionAnswer = (questionId: number, answer: string) => {
    onQuestionAnswersChange(prev => ({ ...prev, [questionId]: answer }))
  }

  const beforePricingQuestions = filterQuestionsForStep(questions, "beforePricing")
  const allRequiredBeforePricingAnswered = beforePricingQuestions
    .filter(q => q.IsRequired)
    .every(q => {
      const answer = questionAnswers[q.QuestionId]
      return answer !== undefined && answer.toString().trim() !== ""
    })

  const handleContinue = async () => {
    setSubmissionError("")
    setConsentError("")
    setScopeError("")
    setQuestionsError("")
    const contactOk = validateContactFields()
    // A ZIP is "resolvable" when the server-side lookup has run, regardless of
    // whether it matched a service zone. In-service → advance to Step 2;
    // outside-service → capture the lead and show a terminal thanks screen.
    const zipResolved = !!validatedPostalCode || postalCodeOutsideArea
    if (!zipResolved) {
      setPostalCodeError("Please enter a valid postal code to continue")
    }
    const inService = !!validatedPostalCode
    // Outside-area visitors still need required-data for the lead record, but
    // service / frequency / before-pricing questions don't matter because we
    // won't actually quote them.
    const scopeOk = inService ? !!scopeGroupId && selectedScopes.length > 0 : true
    if (inService && !scopeOk) {
      setScopeError("Please choose a service to continue")
    }
    const questionsOk = inService ? allRequiredBeforePricingAnswered : true
    if (inService && !questionsOk) {
      setQuestionsError("Please answer the required questions to continue")
    }
    const consentOk = smsConsentTransactional && smsConsentMarketing
    if (!consentOk) {
      setConsentError("Please agree to both SMS consent statements to continue")
    }
    if (!contactOk || !zipResolved || !scopeOk || !questionsOk || !consentOk) return
    if (!token) {
      setSubmissionError("Authentication not ready. Please refresh and try again.")
      return
    }

    setIsSubmitting(true)
    try {
      const postalCode = validatedPostalCode?.PostalCode ?? values.zipCode.trim()
      const leadData: LeadCreateRequest = {
        LeadId: formData.leadId,
        FirstName: values.firstName.trim(),
        LastName: values.lastName.trim(),
        Email: values.email.trim(),
        Phone: values.phone.replace(/\D/g, ""),
        PostalCode: postalCode,
        // Skip ScopeGroupId when outside-area — the visitor didn't pick a service.
        ...(inService && scopeGroupId ? { ScopeGroupId: scopeGroupId } : {}),
        ...(customerSourceId ? { CustomerSourceId: customerSourceId } : {}),
        ...utmToApiFields(formData.utm),
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
        zipCode: postalCode,
        validatedPostalCode: validatedPostalCode ?? undefined,
        smsConsentTransactional,
        smsConsentMarketing,
        customerSourceId: customerSourceId ?? undefined,
        customer: {
          ...formData.customer,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.replace(/\D/g, ""),
        },
      })

      if (inService) {
        onCompleted()
      } else {
        setOutsideAreaSubmitted(true)
      }
    } catch (err: any) {
      setSubmissionError(err?.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (outsideAreaSubmitted) {
    const submittedZip = formData.zipCode || values.zipCode
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Thanks — we&rsquo;ve got your info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-gray-700">
                We don&rsquo;t currently serve <strong>{submittedZip}</strong>, but
                we&rsquo;ve saved your details and will reach out at{" "}
                <strong>{values.email || formData.customer?.email}</strong> if we
                expand into your area.
              </p>
              <p className="text-gray-600 text-sm">
                Nothing else you need to do. If you&rsquo;d like to enter a
                different address, refresh this page.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const hideServicePicker = postalCodeOutsideArea

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[30px] font-bold text-gray-900 mb-2">About you</h2>
        <p className="text-gray-600">
          Tell us who you are, where we&rsquo;ll be cleaning, and what kind of
          service you need.
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Service area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="zipCode" variant="required">Postal code</Label>
            <div className="mt-2 max-w-xs">
              <Input
                id="zipCode"
                value={values.zipCode}
                onChange={e => setField("zipCode", e.target.value)}
                onBlur={handleZipBlur}
                placeholder="29406"
                className={cn(postalCodeError && "border-red-500")}
                aria-invalid={!!postalCodeError}
              />
              <div className="h-5 mt-1 text-sm">
                {postalCodeLoading && <span className="text-gray-500">Checking…</span>}
                {!postalCodeLoading && postalCodeError && (
                  <span className="text-red-600">{postalCodeError}</span>
                )}
                {!postalCodeLoading && !postalCodeError && validatedPostalCode && (
                  <span className="text-green-700 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Service available in {validatedPostalCode.ZoneName} zone
                  </span>
                )}
                {!postalCodeLoading && !postalCodeError && postalCodeOutsideArea && (
                  <span className="text-amber-700">
                    We don&rsquo;t currently serve this area — leave your info and we&rsquo;ll reach out if that changes.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {!hideServicePicker && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <ServiceSelection multiple />
          {scopeError && selectedScopes.length === 0 && (
            <p className="text-sm text-red-600 mt-2">{scopeError}</p>
          )}
        </motion.div>
      )}

      {!hideServicePicker && selectedScopes.length > 0 && loadingQuestions && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          Loading service details…
        </div>
      )}

      {!hideServicePicker && selectedScopes.length > 0 && !loadingQuestions && (beforePricingQuestions.length > 0 || questionsUnavailable) && (
        <>
          <QuestionsForm
            title="A few details"
            questions={beforePricingQuestions}
            answers={questionAnswers}
            onChange={setQuestionAnswer}
            unavailable={questionsUnavailable}
          />
          {questionsError && <p className="text-sm text-red-600">{questionsError}</p>}
        </>
      )}

      {customerSources.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                How did you hear about us?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="customerSource" variant="muted">Optional</Label>
              <Select
                value={customerSourceId != null ? customerSourceId.toString() : undefined}
                onValueChange={v => setCustomerSourceId(v ? parseInt(v, 10) : null)}
              >
                <SelectTrigger id="customerSource" className="mt-2 max-w-sm">
                  <SelectValue placeholder="Select a source" />
                </SelectTrigger>
                <SelectContent>
                  {customerSources.map(source => (
                    <SelectItem
                      key={source.CustomerSourceId}
                      value={source.CustomerSourceId.toString()}
                    >
                      {source.Name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Text message consent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-blue-600"
                checked={smsConsentTransactional}
                onChange={e => {
                  setSmsConsentTransactional(e.target.checked)
                  if (e.target.checked && smsConsentMarketing) setConsentError("")
                }}
                aria-required
              />
              <span className="text-sm text-gray-800">
                I agree to receive transactional text messages about my booking
                (appointment confirmations, reminders, team updates). Message &amp;
                data rates may apply. Reply STOP to opt out.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-blue-600"
                checked={smsConsentMarketing}
                onChange={e => {
                  setSmsConsentMarketing(e.target.checked)
                  if (e.target.checked && smsConsentTransactional) setConsentError("")
                }}
                aria-required
              />
              <span className="text-sm text-gray-800">
                I agree to receive marketing text messages (promotions,
                seasonal offers). Message &amp; data rates may apply. Reply STOP
                to opt out.
              </span>
            </label>
            {consentError && <p className="text-sm text-red-600">{consentError}</p>}
          </CardContent>
        </Card>
      </motion.div>

      {SHOW_COMPLIANCE_LINKS && (
        <p className="text-sm text-gray-600">
          By continuing, you agree to our
          {TERMS_URL ? (
            <>
              {" "}
              <a
                href={TERMS_URL}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-700 hover:text-blue-800"
              >
                Terms of Service
              </a>
            </>
          ) : null}
          {TERMS_URL && PRIVACY_URL ? " and" : null}
          {PRIVACY_URL ? (
            <>
              {" "}
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-700 hover:text-blue-800"
              >
                Privacy Policy
              </a>
            </>
          ) : null}
          .
        </p>
      )}

      <ApiErrorBanner message={submissionError} />

      <div className="flex justify-end pt-2">
        <Button onClick={handleContinue} disabled={isSubmitting} size="lg">
          {isSubmitting
            ? "Saving…"
            : postalCodeOutsideArea
            ? "Submit contact info"
            : "Continue"}
        </Button>
      </div>
    </div>
  )
}
