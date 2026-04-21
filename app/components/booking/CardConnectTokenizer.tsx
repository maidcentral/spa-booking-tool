"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { CreditCard } from "lucide-react"
import { buildTokenizerUrl } from "@/app/config/cardconnect"

interface CardConnectTokenizerProps {
  onTokenReceived: (token: string, expiry: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

/**
 * Stale-iframe recovery pattern: the CardConnect iframe holds cached CVV state
 * that can wedge tokenization after a validation-failure retry. When a booking
 * attempt fails, the parent should bump a numeric key on this component — React
 * will unmount the iframe and mount a fresh one. Mirrors the internal fix in
 * commit bffa5bca2 (see docs/online-booking-form/04-react-build-spec.md §8).
 */

export function CardConnectTokenizer({
  onTokenReceived,
  onError,
  disabled = false
}: CardConnectTokenizerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tokenizationError, setTokenizationError] = useState<string | null>(null)
  const [paymentToken, setPaymentToken] = useState<string | null>(null)

  // Use configuration-based URL with styling
  const iframeUrl = buildTokenizerUrl({
    mobile: typeof window !== 'undefined' && window.innerWidth < 768,
    useCSS: true
  })

  useEffect(() => {
    const handleTokenizationMessage = (event: MessageEvent) => {
      // Keep origin verification for security (enhanced from official docs)
      const allowedOrigins = [
        "https://fts-uat.cardconnect.com",
        "https://fts.cardconnect.com"
      ]

      if (!allowedOrigins.includes(event.origin)) return

      try {
        const token = JSON.parse(event.data)
        if (token.message) {
          setTokenizationError(null)
          setPaymentToken(token.message)

          const hiddenInput = document.getElementById('mytoken') as HTMLInputElement
          if (hiddenInput) hiddenInput.value = token.message

          onTokenReceived(token.message, token.expiry || "")
        }
      } catch {
        const errorMessage = "Tokenization failed"
        setTokenizationError(errorMessage)
        onError(errorMessage)
      }
    }

    // Add event listener per official docs
    window.addEventListener('message', handleTokenizationMessage, false)

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('message', handleTokenizationMessage, false)
    }
  }, [onTokenReceived, onError])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    const errorMessage = "Failed to load payment form"
    setTokenizationError(errorMessage)
    onError(errorMessage)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Error State */}
          {tokenizationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{tokenizationError}</p>
            </div>
          )}

          {/* Enhanced CardConnect iFrame Container */}
          <div className="relative">
            {/* Branded Payment Container */}
            <div className={`
              payment-iframe-wrapper relative transition-all duration-300
              ${isLoading ? 'hidden' : 'block'}
              ${disabled ? 'opacity-50 pointer-events-none' : ''}
            `} style={{ overflowX: 'hidden', overflowY: 'visible', minHeight: '370px' }}>
              {/* Professional Border and Background */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-0.5 rounded-lg shadow-sm border border-gray-200">
                <div className="bg-white rounded-md overflow-hidden">
                  {/* Payment Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Secure Payment</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">PCI Compliant</span>
                      </div>
                    </div>
                  </div>

                  {/* iframe Container with Form Wrapper */}
                  <div className="relative bg-white min-h-[350px]" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
                    {/* Official CardConnect Form Structure */}
                    <form name="tokenform" id="tokenform">
                      <iframe
                        ref={iframeRef}
                        id="tokenFrame"
                        name="tokenFrame"
                        src={iframeUrl}
                        frameBorder="0"
                        scrolling="auto"
                        width="100%"
                        height="350"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                        title="Secure Payment Form"
                        className="block w-full bg-white"
                        style={{
                          minHeight: '350px',
                          height: '350px',
                          border: 'none',
                          overflowX: 'hidden',
                          overflowY: 'auto',
                          maxWidth: '100%'
                        }}
                      />
                      {/* Hidden input field per official docs */}
                      <input
                        type="hidden"
                        name="mytoken"
                        id="mytoken"
                        value={paymentToken || ''}
                      />
                    </form>

                    {/* Loading Overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-white flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                          <p className="text-sm text-gray-600">Loading secure payment form...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Security Footer */}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span>256-bit SSL</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>PCI DSS Compliant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>CardConnect Secured</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}