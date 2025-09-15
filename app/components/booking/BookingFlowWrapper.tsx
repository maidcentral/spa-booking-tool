"use client"

import React from 'react';
import { isMultiStepLayout, getLayoutMode } from '@/app/lib/config/env';
import { BookingWidget } from './BookingWidget';
import { SinglePageBookingFlow } from './SinglePageBookingFlow';

/**
 * BookingFlowWrapper Component
 * 
 * Conditionally renders either the multi-step BookingWidget or 
 * the single-page SinglePageBookingFlow based on the MULTI_STEP_LAYOUT
 * environment variable.
 * 
 * This decision is made at build time for optimal performance.
 */
export function BookingFlowWrapper() {
  // Read the layout mode from environment configuration
  // This is determined at build time and doesn't change during runtime
  const useMultiStep = isMultiStepLayout();
  
  // Log the layout mode for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
  }
  
  // Conditionally render the appropriate booking flow component
  // Both components share the same functionality and styling,
  // only the navigation pattern differs
  return useMultiStep ? <BookingWidget /> : <SinglePageBookingFlow />;
}

/**
 * Default export for easier importing
 */
export default BookingFlowWrapper;