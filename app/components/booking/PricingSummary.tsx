"use client"

import React, { memo } from "react"
import { motion } from "framer-motion"
import { ShoppingCart, Clock, MapPin, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { formatCurrency } from "@/app/lib/utils"
import { BookingPricing } from "@/app/types/booking"

interface PricingSummaryProps {
  pricing: BookingPricing
  selectedService?: string
  selectedDate?: Date
  selectedTime?: string
  zipCode?: string
  onCheckout?: () => void
  isPricingLoading?: boolean
}

export const PricingSummary = memo(function PricingSummary({
  pricing,
  selectedService,
  selectedDate,
  selectedTime,
  zipCode,
  onCheckout,
  isPricingLoading = false,
}: PricingSummaryProps) {
  return (
    <div>
      <Card className="shadow-lg border-[var(--text-color)]/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Service Details */}
          {selectedService && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">{selectedService}</h4>
              
              <div className="space-y-1 text-sm text-gray-800">
                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                
                {selectedTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{selectedTime}</span>
                  </div>
                )}
                
                {zipCode && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{zipCode}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-3">
            {pricing.lineItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex justify-between items-start text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-gray-700 text-xs">{item.description}</div>
                  )}
                  {item.quantity > 1 && (
                    <div className="text-gray-700 text-xs">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`font-medium ${
                    item.type === 'discount' ? 'text-green-600' :
                    item.type === 'fee' || item.type === 'tax' ? 'text-gray-800' :
                    'text-gray-900'
                  }`}>
                    {item.type === 'discount' ? '-' : ''}
                    {formatCurrency(item.totalPrice)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          {pricing.lineItems.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-[var(--text-color)]/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-800">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(pricing.subtotal)}</span>
              </div>
              
              {pricing.discounts > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">Discounts</span>
                  <span className="text-green-600">-{formatCurrency(pricing.discounts)}</span>
                </div>
              )}
              
              {pricing.fees > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">Fees</span>
                  <span className="text-gray-900">{formatCurrency(pricing.fees)}</span>
                </div>
              )}
              
              {pricing.taxes > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">Tax</span>
                  <span className="text-gray-900">{formatCurrency(pricing.taxes)}</span>
                </div>
              )}
            </div>
          )}

          {/* First-job vs. recurring split — shown when they differ (e.g. a
              recurring booking with a one-time initial deep clean) to match
              the MaidCentral built-in summary. Falls through to a single
              Total row for one-time services where the two are equal. */}
          {!isPricingLoading &&
            pricing.lineItems.length > 0 &&
            pricing.recurringTotal > 0 &&
            pricing.firstJobTotal > 0 &&
            pricing.firstJobTotal !== pricing.recurringTotal && (
              <div className="space-y-2 pt-4 border-t border-[var(--text-color)]/50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">First visit</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(pricing.firstJobTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-800">Each recurring visit</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(pricing.recurringTotal)}
                  </span>
                </div>
              </div>
            )}

          {/* Total */}
          <div className="pt-4 border-t border-[var(--text-color)]/50">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              {isPricingLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Calculating...</span>
                </div>
              ) : (
                <motion.span
                  key={pricing.total}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-blue-600"
                >
                  {formatCurrency(pricing.total)}
                </motion.span>
              )}
            </div>
          </div>

          {/* Checkout Button */}
          {onCheckout && pricing.total > 0 && (
            <div className="pt-4">
              <Button
                onClick={onCheckout}
                className="w-full"
                variant="primary"
                size="lg"
              >
                Continue to Checkout
              </Button>
            </div>
          )}

          {/* Empty State */}
          {pricing.lineItems.length === 0 && (
            <div className="text-center py-8 text-gray-700">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Select a service to see pricing</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Indicators */}
      <div className="mt-4 space-y-2 text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Satisfaction guaranteed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Secure payment processing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Insured & bonded professionals</span>
        </div>
      </div>
    </div>
  )
})