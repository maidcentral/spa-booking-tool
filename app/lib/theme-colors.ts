// Color utility functions for dynamic theming

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface ThemeColors {
  foreground: string
  background: string
  primary: string
  contrast: string
  textColor: string
  borderColor: string
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove hash if present
  const cleanHex = hex.replace('#', '')
  
  // Handle 3-character hex codes
  if (cleanHex.length === 3) {
    const expandedHex = cleanHex
      .split('')
      .map(char => char + char)
      .join('')
    return hexToRgb('#' + expandedHex)
  }
  
  // Handle 6-character hex codes
  if (cleanHex.length === 6) {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  return null
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  
  let h = 0
  let s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  
  return { h, s, l }
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  
  let r, g, b
  
  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

/**
 * Calculate relative luminance of a color (WCAG standard)
 */
export function getLuminance(rgb: RGB): number {
  const { r, g, b } = rgb
  
  const srgb = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

/**
 * Calculate contrast ratio between two colors (WCAG standard)
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  
  const lightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (lightest + 0.05) / (darkest + 0.05)
}

/**
 * Determine if a color is light or dark
 */
export function isColorLight(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  
  const luminance = getLuminance(rgb)
  return luminance > 0.5
}

/**
 * Generate a contrasting color based on the foreground color
 */
export function generateContrastColor(foregroundHex: string): string {
  const isLight = isColorLight(foregroundHex)
  
  if (isLight) {
    // For light foreground, return a dark color
    return '#1f2937' // Dark gray
  } else {
    // For dark foreground, return a light color
    return '#f9fafb' // Light gray
  }
}

/**
 * Generate appropriate text color based on background
 */
export function generateTextColor(backgroundHex: string): string {
  const isLight = isColorLight(backgroundHex)
  
  if (isLight) {
    // Dark text on light background
    return '#111827'
  } else {
    // Light text on dark background  
    return '#f9fafb'
  }
}

/**
 * Generate border color that contrasts with foreground
 */
export function generateBorderColor(foregroundHex: string): string {
  const rgb = hexToRgb(foregroundHex)
  if (!rgb) return '#d1d5db' // Default border color
  
  const hsl = rgbToHsl(rgb)
  const isLight = isColorLight(foregroundHex)
  
  if (isLight) {
    // For light foreground, make border darker
    const darkerHsl: HSL = {
      h: hsl.h,
      s: Math.max(0.1, hsl.s * 0.8), // Reduce saturation slightly
      l: Math.max(0.2, hsl.l - 0.3) // Make significantly darker
    }
    return rgbToHex(hslToRgb(darkerHsl))
  } else {
    // For dark foreground, make border lighter
    const lighterHsl: HSL = {
      h: hsl.h,
      s: Math.max(0.1, hsl.s * 0.8), // Reduce saturation slightly
      l: Math.min(0.8, hsl.l + 0.3) // Make significantly lighter
    }
    return rgbToHex(hslToRgb(lighterHsl))
  }
}

/**
 * Validate if a string is a valid hex color
 */
export function validateColor(color: string): boolean {
  if (!color) return false
  
  const cleanColor = color.replace('#', '')
  
  // Check if it's a valid 3 or 6 character hex
  const hexRegex = /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/
  return hexRegex.test(cleanColor)
}

/**
 * Sanitize and normalize color parameter with enhanced security
 */
export function sanitizeColorParam(color: string | null): string | null {
  if (!color || typeof color !== 'string') return null
  
  try {
    // Remove any potential harmful characters and whitespace
    let cleaned = color
      .trim()
      .toLowerCase()
      .replace(/[^0-9a-f#]/g, '') // Only allow hex characters and hash
      .substring(0, 7) // Limit length to prevent long strings
    
    if (!cleaned) return null
    
    // Validate the cleaned color
    if (!validateColor(cleaned)) return null
    
    // Normalize to 6-character hex with hash
    const hex = cleaned.replace('#', '')
    
    if (hex.length === 3) {
      const expanded = hex.split('').map(char => char + char).join('')
      return '#' + expanded
    } else if (hex.length === 6) {
      return '#' + hex
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Parse color parameters from URL with fallbacks and error handling
 */
export function parseColorParam(searchParams: URLSearchParams | null): ThemeColors {
  const defaultColors = {
    foreground: '#3b82f6', // Default blue (this should be an accent color)
    background: '#ffffff', // Default white
    primary: '#3b82f6' // Default blue
  }
  
  try {
    // Handle null or undefined searchParams
    if (!searchParams) {
      return generateThemeColors(defaultColors.foreground, defaultColors.background, defaultColors.primary)
    }
    
    // Extract and sanitize color parameters
    const foregroundParam = searchParams.get('foreground')
    const backgroundParam = searchParams.get('background') 
    const primaryParam = searchParams.get('primary')
    
    const foreground = sanitizeColorParam(foregroundParam) || defaultColors.foreground
    const background = sanitizeColorParam(backgroundParam) || defaultColors.background
    const primary = sanitizeColorParam(primaryParam) || defaultColors.primary
    
    return generateThemeColors(foreground, background, primary)
  } catch (error) {
    return generateThemeColors(defaultColors.foreground, defaultColors.background, defaultColors.primary)
  }
}

/**
 * Generate complete theme colors from base colors
 */
function generateThemeColors(foreground: string, background: string, primary: string): ThemeColors {
  try {
    // Generate derived colors with error handling
    const contrast = generateContrastColor(foreground)
    const textColor = generateTextColor(background)
    const borderColor = generateBorderColor(foreground)
    
    return {
      foreground,
      background,
      primary,
      contrast,
      textColor,
      borderColor
    }
  } catch (error) {
    
    // Return safe fallback theme
    return {
      foreground: '#3b82f6',
      background: '#ffffff', 
      primary: '#3b82f6',
      contrast: '#f9fafb',
      textColor: '#111827',
      borderColor: '#d1d5db'
    }
  }
}