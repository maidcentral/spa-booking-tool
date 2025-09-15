'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  ThemeColors, 
  parseColorParam, 
  isColorLight 
} from '@/app/lib/theme-colors'
import {
  injectThemeProperties,
  removeThemeProperties,
  createThemeStyleObject,
  createCssVarReferences,
  THEME_CSS_VARIABLES
} from '@/app/lib/css-properties'

interface ThemeContextType extends ThemeColors {
  isLight: boolean
  cssVars: Record<string, string>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const searchParams = useSearchParams()

  // Parse colors from URL parameters with memoization
  const themeColors = useMemo(() => {
    return parseColorParam(searchParams)
  }, [searchParams])

  // Calculate derived theme properties
  const theme = useMemo(() => {
    const isLight = isColorLight(themeColors.foreground)
    
    // CSS custom properties object for inline styles using the new system
    const cssVars = createThemeStyleObject(themeColors)

    return {
      ...themeColors,
      isLight,
      cssVars
    }
  }, [themeColors])

  // Inject CSS custom properties into document root using the new system
  useEffect(() => {
    // Inject theme properties
    injectThemeProperties(themeColors)

    // Cleanup function to remove properties if component unmounts
    return () => {
      removeThemeProperties()
    }
  }, [themeColors])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

// Higher-order component for class-based components (if needed)
export function withTheme<P extends object>(
  Component: React.ComponentType<P & { theme: ThemeContextType }>
) {
  const WrappedComponent = (props: P) => {
    const theme = useTheme()
    return <Component {...props} theme={theme} />
  }
  
  WrappedComponent.displayName = `withTheme(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Utility hook for getting specific theme colors
export function useThemeColor(colorKey: keyof ThemeColors): string {
  const theme = useTheme()
  return theme[colorKey]
}

// Utility hook for conditional theming based on light/dark
export function useThemeVariant<T>(lightValue: T, darkValue: T): T {
  const theme = useTheme()
  return theme.isLight ? lightValue : darkValue
}

// Hook for getting CSS custom property strings for Tailwind arbitrary values
export function useThemeCssVars() {
  const theme = useTheme()
  
  return useMemo(() => {
    const cssVarRefs = createCssVarReferences()
    
    return {
      // For use in Tailwind arbitrary values like bg-[var(--theme-foreground)]
      ...cssVarRefs,
      
      // CSS variable names for direct access
      variables: THEME_CSS_VARIABLES,
      
      // For inline styles
      style: theme.cssVars
    }
  }, [theme.cssVars])
}