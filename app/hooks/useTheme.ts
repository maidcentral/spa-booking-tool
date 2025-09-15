"use client"

import { useEffect, useState } from 'react'
import { ThemePerformanceMonitor } from '@/app/lib/performance'

export interface ThemeColors {
  primaryColor: string
  foregroundColor: string
  backgroundColor: string
  textColor?: string
}

export interface ParsedTheme {
  primaryColor: string | null
  foregroundColor: string | null
  backgroundColor: string | null
  textColor: string | null
}

// Default theme colors
const DEFAULT_THEME: ThemeColors = {
  primaryColor: '#3B82F6',    // Blue-500
  foregroundColor: '#FFFFFF',  // White
  backgroundColor: '#F9FAFB',  // Gray-50
  textColor: '#000000'         // Black (explicit default for visibility)
}

/**
 * Validates a hex color code
 * Accepts both #FFFFFF and FFFFFF formats
 * Only accepts 6-digit hex codes for security and consistency
 */
export function validateHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false
  }

  // Remove # if present for validation
  const cleanColor = color.startsWith('#') ? color.slice(1) : color
  
  // Check for exact 6 character hex code
  const hexRegex = /^[0-9A-Fa-f]{6}$/
  
  // Additional security check - ensure no special characters that could be used for XSS
  const hasDangerousChars = /[<>\"\'`;\\(){}]/.test(color)
  
  return hexRegex.test(cleanColor) && !hasDangerousChars
}

/**
 * Normalizes a hex color to always include the # prefix
 */
function normalizeHexColor(color: string): string {
  const cleaned = color.trim()
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
}

/**
 * Parses theme colors from URL parameters
 * Supports both short names (primary, foreground, background) and full names (primaryColor, etc.)
 * Returns null for invalid or missing colors
 */
export function parseThemeFromURL(): ParsedTheme {
  const monitor = new ThemePerformanceMonitor()
  monitor.startUrlParsing()

  if (typeof window === 'undefined') {
    return {
      primaryColor: null,
      foregroundColor: null,
      backgroundColor: null,
      textColor: null
    }
  }

  const params = new URLSearchParams(window.location.search)
  const urlParsingTime = monitor.endUrlParsing()
  
  monitor.startValidation()
  
  // Support both parameter name formats for better user experience:
  // Short names: primary, foreground, background, text (user-friendly)
  // Full names: primaryColor, foregroundColor, backgroundColor, textColor (legacy)
  const primaryParam = params.get('primary') || params.get('primaryColor')
  const foregroundParam = params.get('foreground') || params.get('foregroundColor')
  const backgroundParam = params.get('background') || params.get('backgroundColor')
  const textParam = params.get('text') || params.get('textColor')

  // Enhanced validation with detailed logging
  const result = {
    primaryColor: validateAndNormalizeColor(primaryParam, 'primary'),
    foregroundColor: validateAndNormalizeColor(foregroundParam, 'foreground'),
    backgroundColor: validateAndNormalizeColor(backgroundParam, 'background'),
    textColor: validateAndNormalizeColor(textParam, 'text')
  }

  const validationTime = monitor.endValidation()
  
  
  // Complete monitoring
  monitor.complete(urlParsingTime, validationTime, 0) // CSS time tracked separately

  return result
}

/**
 * Validates and normalizes a color parameter with enhanced error handling
 */
function validateAndNormalizeColor(colorParam: string | null, paramName: string): string | null {
  if (!colorParam) {
    return null
  }
  
  if (validateHexColor(colorParam)) {
    return normalizeHexColor(colorParam)
  } else {
    return null
  }
}

/**
 * Combines parsed theme with defaults
 * Uses default colors for any invalid or missing values
 */
export function getThemeColors(parsedTheme: ParsedTheme): ThemeColors {
  return {
    primaryColor: parsedTheme.primaryColor || DEFAULT_THEME.primaryColor,
    foregroundColor: parsedTheme.foregroundColor || DEFAULT_THEME.foregroundColor,
    backgroundColor: parsedTheme.backgroundColor || DEFAULT_THEME.backgroundColor,
    textColor: parsedTheme.textColor || DEFAULT_THEME.textColor // Use default black if not provided
  }
}

/**
 * Custom hook for managing dynamic theme colors
 * Parses URL parameters and applies theme colors via CSS variables
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME)
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  useEffect(() => {
    // Parse theme from URL
    const parsedTheme = parseThemeFromURL()
    const finalTheme = getThemeColors(parsedTheme)
    
    // Update state
    setTheme(finalTheme)
    
    // Apply theme to CSS variables
    applyThemeToCSS(finalTheme)
    
    // Mark theme as loaded to prevent flash of unstyled content
    setIsThemeLoaded(true)
  }, [])

  return {
    theme,
    isThemeLoaded,
    applyTheme: (newTheme: Partial<ThemeColors>) => {
      const updatedTheme = { ...theme, ...newTheme }
      setTheme(updatedTheme)
      applyThemeToCSS(updatedTheme)
    }
  }
}

/**
 * Applies theme colors to CSS custom properties
 * This enables dynamic theming throughout the application
 */
function applyThemeToCSS(theme: ThemeColors) {
  if (typeof document === 'undefined') return

  const monitor = new ThemePerformanceMonitor()
  monitor.startCssApplication()

  const root = document.documentElement
  
  // Apply primary color and derived colors
  root.style.setProperty('--primary-color', theme.primaryColor)
  root.style.setProperty('--primary-color-hover', adjustColorBrightness(theme.primaryColor, -10))
  root.style.setProperty('--primary-color-active', adjustColorBrightness(theme.primaryColor, -20))
  
  // Apply foreground color
  root.style.setProperty('--foreground-color', theme.foregroundColor)
  
  // Apply background color
  root.style.setProperty('--background-color', theme.backgroundColor)
  
  // Always use the theme text color (defaults to black)
  const textColor = theme.textColor || '#000000'
  
  root.style.setProperty('--text-color', textColor)

  const cssApplicationTime = monitor.endCssApplication()
  
  // Log CSS application performance
  monitor.complete(0, 0, cssApplicationTime) // URL parsing and validation tracked separately
}

/**
 * Adjusts color brightness for hover/active states
 * @param hex - Hex color code
 * @param percent - Percentage to adjust (-100 to 100)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace('#', '')
  
  // Convert to RGB
  const num = parseInt(color, 16)
  const r = (num >> 16) + percent
  const g = ((num >> 8) & 0x00FF) + percent
  const b = (num & 0x0000FF) + percent
  
  // Ensure values are within 0-255 range
  const newR = Math.min(255, Math.max(0, r))
  const newG = Math.min(255, Math.max(0, g))
  const newB = Math.min(255, Math.max(0, b))
  
  // Convert back to hex
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1).toUpperCase()}`
}

/**
 * Determines appropriate text color (black or white) based on background color
 * Uses luminance calculation for WCAG compliance
 */
function getContrastTextColor(backgroundColor: string): string {
  // Remove # if present
  const color = backgroundColor.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

export default useTheme