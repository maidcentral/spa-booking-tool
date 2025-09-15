'use client'

import { useState, useEffect } from 'react'
import { ThemeColors, parseColorParam } from '@/app/lib/theme-colors'
import { injectThemeProperties, areThemePropertiesSet } from '@/app/lib/css-properties'
import { safeParseParams } from '@/app/lib/url-params'

/**
 * Hook to prevent Flash of Unstyled Content (FOUC) by ensuring
 * CSS custom properties are set before rendering
 */
export function useThemeHydration(): {
  isHydrated: boolean
  themeColors: ThemeColors
} {
  const [isHydrated, setIsHydrated] = useState(false)
  const [themeColors, setThemeColors] = useState<ThemeColors>(() => {
    // Server-side fallback
    return parseColorParam(null)
  })

  useEffect(() => {
    // Client-side theme initialization
    const initializeTheme = () => {
      try {
        // Parse colors from URL
        const params = safeParseParams(window.location.search)
        const colors = parseColorParam(params)
        
        // Inject CSS properties synchronously
        injectThemeProperties(colors)
        
        // Update state
        setThemeColors(colors)
        
        // Use requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
          setIsHydrated(true)
        })
      } catch (error) {
        // Fallback to hydrated state even on error
        setIsHydrated(true)
      }
    }

    initializeTheme()
  }, [])

  return { isHydrated, themeColors }
}

/**
 * Hook for components that need to wait for theme hydration
 */
export function useThemeReady(): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkThemeReady = () => {
      if (areThemePropertiesSet()) {
        setIsReady(true)
      } else {
        // Check again after a short delay
        setTimeout(checkThemeReady, 16)
      }
    }

    checkThemeReady()
  }, [])

  return isReady
}

/**
 * Component wrapper to prevent FOUC
 */
interface ThemeGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ThemeGuard({ children, fallback = null }: ThemeGuardProps) {
  const { isHydrated } = useThemeHydration()
  
  if (!isHydrated) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}