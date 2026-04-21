"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { isMultiStepLayout } from '@/app/lib/config/env';

export type BookingLayoutMode = 'multi-step' | 'single-page';

interface BookingLayoutContextType {
  layoutMode: BookingLayoutMode;
  isMultiStep: boolean;
  isSinglePage: boolean;
}

const BookingLayoutContext = createContext<BookingLayoutContextType | undefined>(undefined);

/**
 * Reads the layout override from `?layout=multi-step` / `?layout=single-page` on
 * the URL. Returns null if the param is absent or invalid. Lets partners A/B
 * test both layouts from the same deployment without cutting a new build.
 */
function readLayoutFromUrl(): BookingLayoutMode | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('layout');
  if (param === 'multi-step' || param === 'single-page') return param;
  return null;
}

export function BookingLayoutProvider({ children }: { children: React.ReactNode }) {
  // Initial render (SSR + first client paint) uses the env-var default so both
  // sides match. Then useEffect swaps in the URL override on the client only.
  const envDefault: BookingLayoutMode = isMultiStepLayout() ? 'multi-step' : 'single-page';
  const [layoutMode, setLayoutMode] = useState<BookingLayoutMode>(envDefault);

  useEffect(() => {
    const fromUrl = readLayoutFromUrl();
    if (fromUrl && fromUrl !== layoutMode) setLayoutMode(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: BookingLayoutContextType = {
    layoutMode,
    isMultiStep: layoutMode === 'multi-step',
    isSinglePage: layoutMode === 'single-page',
  };

  return (
    <BookingLayoutContext.Provider value={value}>
      {children}
    </BookingLayoutContext.Provider>
  );
}

export function useBookingLayout(): BookingLayoutContextType {
  const context = useContext(BookingLayoutContext);
  if (context === undefined) {
    throw new Error('useBookingLayout must be used within a BookingLayoutProvider');
  }
  return context;
}
