"use client"

import React, { useState } from "react"
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { friendlyApiError } from "@/app/lib/api-errors"

interface ApiErrorBannerProps {
  /** Raw API message (or any string). Rendered through the error mapper. */
  message?: string | null
  className?: string
}

export function ApiErrorBanner({ message, className }: ApiErrorBannerProps) {
  const [expanded, setExpanded] = useState(false)
  if (!message) return null
  const { headline, details } = friendlyApiError(message)
  const hasDetails = details && details !== headline

  return (
    <div
      className={
        "p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 " + (className ?? "")
      }
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">{headline}</p>
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 underline"
            >
              {expanded ? (
                <>
                  Hide details <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Show details <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
          {hasDetails && expanded && (
            <p className="mt-2 text-xs text-red-700 break-words">{details}</p>
          )}
        </div>
      </div>
    </div>
  )
}
