// CSS Custom Properties utility functions for dynamic theming

import { ThemeColors } from './theme-colors'

/**
 * CSS custom property names for theme colors
 */
export const THEME_CSS_VARIABLES = {
  foreground: '--theme-foreground',
  background: '--theme-background',
  primary: '--theme-primary',
  contrast: '--theme-contrast',
  text: '--theme-text',
  border: '--theme-border'
} as const

/**
 * Inject all theme colors as CSS custom properties into document root
 */
export function injectThemeProperties(themeColors: Partial<ThemeColors>): void {
  if (typeof document === 'undefined') {
    // Skip on server-side rendering
    return
  }

  try {
    const root = document.documentElement
    
    // Map theme colors to CSS custom properties
    const propertyMap: Record<keyof typeof THEME_CSS_VARIABLES, keyof ThemeColors> = {
      foreground: 'foreground',
      background: 'background',
      primary: 'primary',
      contrast: 'contrast',
      text: 'textColor',
      border: 'borderColor'
    }

    // Set each property if it has a valid value
    Object.entries(propertyMap).forEach(([cssVar, colorKey]) => {
      const cssProperty = THEME_CSS_VARIABLES[cssVar as keyof typeof THEME_CSS_VARIABLES]
      const colorValue = themeColors[colorKey]
      
      if (colorValue && typeof colorValue === 'string') {
        root.style.setProperty(cssProperty, colorValue)
      }
    })
  } catch (error) {
  }
}

/**
 * Remove all theme CSS custom properties from document root
 */
export function removeThemeProperties(): void {
  if (typeof document === 'undefined') {
    return
  }

  try {
    const root = document.documentElement
    
    Object.values(THEME_CSS_VARIABLES).forEach(property => {
      root.style.removeProperty(property)
    })
  } catch (error) {
  }
}

/**
 * Update a single CSS custom property
 */
export function updateThemeProperty(property: string, value: string): void {
  if (typeof document === 'undefined') {
    return
  }

  try {
    if (!property || typeof property !== 'string') {
      return
    }

    const root = document.documentElement
    
    if (value && typeof value === 'string') {
      root.style.setProperty(property, value)
    } else {
      root.style.removeProperty(property)
    }
  } catch (error) {
  }
}

/**
 * Get current value of a CSS custom property
 */
export function getThemeProperty(property: string): string {
  if (typeof document === 'undefined') {
    return ''
  }

  try {
    const root = document.documentElement
    return getComputedStyle(root).getPropertyValue(property).trim()
  } catch (error) {
    return ''
  }
}

/**
 * Check if all theme properties are currently set
 */
export function areThemePropertiesSet(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  try {
    return Object.values(THEME_CSS_VARIABLES).every(property => {
      const value = getThemeProperty(property)
      return value.length > 0
    })
  } catch (error) {
    return false
  }
}

/**
 * Get all current theme properties as an object
 */
export function getAllThemeProperties(): Record<string, string> {
  if (typeof document === 'undefined') {
    return {}
  }

  try {
    const properties: Record<string, string> = {}
    
    Object.entries(THEME_CSS_VARIABLES).forEach(([key, property]) => {
      properties[key] = getThemeProperty(property)
    })
    
    return properties
  } catch (error) {
    return {}
  }
}

/**
 * Create CSS custom property object for inline styles
 */
export function createThemeStyleObject(themeColors: Partial<ThemeColors>): Record<string, string> {
  const styleObject: Record<string, string> = {}
  
  // Map theme colors to CSS custom properties
  const propertyMap: Record<keyof typeof THEME_CSS_VARIABLES, keyof ThemeColors> = {
    foreground: 'foreground',
    background: 'background',
    primary: 'primary',
    contrast: 'contrast',
    text: 'textColor',
    border: 'borderColor'
  }

  Object.entries(propertyMap).forEach(([cssVar, colorKey]) => {
    const cssProperty = THEME_CSS_VARIABLES[cssVar as keyof typeof THEME_CSS_VARIABLES]
    const colorValue = themeColors[colorKey]
    
    if (colorValue && typeof colorValue === 'string') {
      styleObject[cssProperty] = colorValue
    }
  })

  return styleObject
}

/**
 * Utility for creating CSS var() references for use in Tailwind arbitrary values
 */
export function createCssVarReferences() {
  return {
    foreground: `var(${THEME_CSS_VARIABLES.foreground})`,
    background: `var(${THEME_CSS_VARIABLES.background})`,
    primary: `var(${THEME_CSS_VARIABLES.primary})`,
    contrast: `var(${THEME_CSS_VARIABLES.contrast})`,
    text: `var(${THEME_CSS_VARIABLES.text})`,
    border: `var(${THEME_CSS_VARIABLES.border})`
  }
}

/**
 * Performance-optimized batch update for multiple properties
 */
export function batchUpdateThemeProperties(themeColors: Partial<ThemeColors>): void {
  if (typeof document === 'undefined') {
    return
  }

  try {
    const root = document.documentElement
    
    // Use requestAnimationFrame to batch DOM updates
    requestAnimationFrame(() => {
      injectThemeProperties(themeColors)
    })
  } catch (error) {
  }
}

/**
 * Debounced update to prevent excessive DOM manipulation
 */
let updateTimeout: NodeJS.Timeout | null = null

export function debouncedUpdateThemeProperties(
  themeColors: Partial<ThemeColors>, 
  delay: number = 16
): void {
  if (updateTimeout) {
    clearTimeout(updateTimeout)
  }

  updateTimeout = setTimeout(() => {
    batchUpdateThemeProperties(themeColors)
    updateTimeout = null
  }, delay)
}

/**
 * Hook-friendly CSS property injection with cleanup
 */
export function useThemePropertiesEffect(
  themeColors: Partial<ThemeColors>,
  cleanup: () => void
): void {
  if (typeof document === 'undefined') {
    return
  }

  try {
    // Inject properties
    injectThemeProperties(themeColors)

    // Return cleanup function
    return cleanup
  } catch (error) {
  }
}