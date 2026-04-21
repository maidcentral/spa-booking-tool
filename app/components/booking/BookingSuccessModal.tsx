"use client"

import React from 'react'
import { Check, Calendar, MapPin, Clock } from 'lucide-react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { motion } from 'framer-motion'

interface BookingSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  customerEmail: string
  leadId?: number | null
  selectedService?: string
  selectedDate?: Date | null
  selectedTime?: string
  zipCode?: string
}

export function BookingSuccessModal({
  isOpen,
  onClose,
  customerEmail,
  leadId,
  selectedService,
  selectedDate,
  selectedTime,
  zipCode,
}: BookingSuccessModalProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Not selected'
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time?: string) => {
    if (!time) return 'Not selected'
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg"
      closeOnBackdropClick={false}
    >
      <div className="text-center">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
          className="mx-auto mb-6"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600" />
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed! 🎉
          </h2>
          <p className="text-gray-600">
            Thank you! Your cleaning service has been successfully booked and scheduled.
          </p>
        </motion.div>

        {/* Booking Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-50 rounded-lg p-4 mb-6 text-left"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>

          <div className="space-y-2 text-sm">
            {selectedService && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Service: {selectedService}</span>
              </div>
            )}

            {selectedDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Date: {formatDate(selectedDate)}</span>
              </div>
            )}

            {selectedTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Time: {formatTime(selectedTime)}</span>
              </div>
            )}

            {zipCode && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Area: {zipCode}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Confirmation Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <div className="text-sm text-gray-500 space-y-1">
            <p>A confirmation email has been sent to:</p>
            <p className="font-medium text-gray-700">{customerEmail}</p>

            {leadId && (
              <p className="text-xs text-gray-400 mt-2">
                Reference ID: #{leadId}
              </p>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={onClose}
            variant="primary"
            size="lg"
            className="min-w-32"
          >
            Perfect!
          </Button>

          <Button
            onClick={() => window.print()}
            variant="outline"
            size="lg"
            className="min-w-32"
          >
            Print Details
          </Button>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 pt-4 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500">
            Need to make changes? Contact us or check your confirmation email for instructions.
          </p>
        </motion.div>
      </div>
    </Modal>
  )
}

export default BookingSuccessModal