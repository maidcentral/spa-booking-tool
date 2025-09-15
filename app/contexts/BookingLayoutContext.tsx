"use client"

import React, { createContext, useContext, useMemo } from 'react';
import { isMultiStepLayout, isSinglePageLayout, getLayoutMode } from '@/app/lib/config/env';

/**
 * BookingLayoutContext
 * Provides layout mode information throughout the booking flow
 */
interface BookingLayoutContextType {
  /**
   * Current layout mode
   */
  layoutMode: 'multi-step' | 'single-page';
  
  /**
   * Check if multi-step layout is active
   */
  isMultiStep: boolean;
  
  /**
   * Check if single-page layout is active
   */
  isSinglePage: boolean;
}

const BookingLayoutContext = createContext<BookingLayoutContextType | undefined>(undefined);

/**
 * BookingLayoutProvider
 * Provides layout configuration to child components
 */
export function BookingLayoutProvider({ children }: { children: React.ReactNode }) {
  // Read environment configuration once at provider level
  // This ensures consistent behavior throughout the component tree
  const contextValue = useMemo<BookingLayoutContextType>(() => ({
    layoutMode: getLayoutMode(),
    isMultiStep: isMultiStepLayout(),
    isSinglePage: isSinglePageLayout(),
  }), []); // Empty deps array - environment variables don't change at runtime

  return (
    <BookingLayoutContext.Provider value={contextValue}>
      {children}
    </BookingLayoutContext.Provider>
  );
}

/**
 * useBookingLayout Hook
 * Access booking layout configuration from any component
 */
export function useBookingLayout() {
  const context = useContext(BookingLayoutContext);
  
  if (context === undefined) {
    throw new Error('useBookingLayout must be used within a BookingLayoutProvider');
  }
  
  return context;
}

/**
 * Helper component for conditional rendering based on layout mode
 * Usage: <LayoutConditional multiStep={<MultiStepComponent />} singlePage={<SinglePageComponent />} />
 */
export function LayoutConditional({ 
  multiStep, 
  singlePage 
}: { 
  multiStep: React.ReactNode; 
  singlePage: React.ReactNode;
}) {
  const { isMultiStep } = useBookingLayout();
  return <>{isMultiStep ? multiStep : singlePage}</>;
}