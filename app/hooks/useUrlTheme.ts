'use client'

import { useState, useEffect } from 'react'
import { ThemeColors, parseColorParam } from '@/app/lib/theme-colors'
import { safeParseParams } from '@/app/lib/url-params'

/**
 * Hook for accessing theme colors directly from URL parameters
 * Useful for components that need theme access without ThemeProvider
 */
export function useUrlTheme(): ThemeColors {
  const [theme, setTheme] = useState<ThemeColors>(() => {
    // Initialize with defaults for SSR
    return parseColorParam(null)
  })

  useEffect(() => {
    // Client-side only URL parameter parsing
    const updateTheme = () => {
      try {
        const params = safeParseParams(window.location.search)
        const newTheme = parseColorParam(params)
        setTheme(newTheme)
      } catch (error) {
        // Keep current theme on error
      }
    }

    // Initial update
    updateTheme()

    // Listen for URL changes (for SPA navigation)
    const handlePopState = () => {
      updateTheme()
    }

    window.addEventListener('popstate', handlePopState)

    // Optional: Listen for hash changes if needed
    const handleHashChange = () => {
      updateTheme()
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return theme
}

/**
 * Hook for getting a specific color from URL parameters
 */
export function useUrlThemeColor(colorKey: keyof ThemeColors): string {
  const theme = useUrlTheme()
  return theme[colorKey]
}

/**
 * Hook for checking if current theme is light or dark
 */
export function useIsThemeLight(): boolean {
  const theme = useUrlTheme()
  const { isColorLight } = require('@/app/lib/theme-colors')
  return isColorLight(theme.foreground)
}