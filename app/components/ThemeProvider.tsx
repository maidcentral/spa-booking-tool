"use client"

import { useTheme } from '@/app/hooks/useTheme'
import { ReactNode, useLayoutEffect, useState, useEffect } from 'react'
// import IframeDebugger from '@/app/lib/iframe-debug'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, isThemeLoaded } = useTheme()
  const [isFirstPaintPrevented, setIsFirstPaintPrevented] = useState(false)

  // Initialize iframe debugger in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      try {
        // const iframeDebugger = new IframeDebugger()
        
      } catch (error) {
      }
    }
  }, [theme, isThemeLoaded])

  // Use useLayoutEffect to apply theme synchronously before first paint
  useLayoutEffect(() => {
    if (isThemeLoaded) {
      // Apply theme immediately to prevent FOUC
      const root = document.documentElement
      
      // Set CSS variables with high priority
      root.style.setProperty('--primary-color', theme.primaryColor, 'important')
      root.style.setProperty('--foreground-color', theme.foregroundColor, 'important') 
      root.style.setProperty('--background-color', theme.backgroundColor, 'important')
      
      // Set one simple text color
      const textColor = (theme as any).textColor || '#000000'
      root.style.setProperty('--text-color', textColor, 'important')
      
      
      // Performance optimization: Batch DOM updates
      requestAnimationFrame(() => {
        setIsFirstPaintPrevented(true)
      })
    }
  }, [theme, isThemeLoaded])

  // Pre-render with inline styles to prevent FOUC completely
  if (!isThemeLoaded || !isFirstPaintPrevented) {
    return (
      <div 
        style={{ 
          backgroundColor: theme.backgroundColor || '#F9FAFB',
          minHeight: '100vh',
          position: 'relative',
          // Ensure content is hidden until theme is fully applied
          visibility: isThemeLoaded ? 'visible' : 'hidden',
          transition: 'visibility 0s linear 0s'
        }}
      >
        {/* Pre-apply CSS variables via style tag for instant application */}
        <style 
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --primary-color: ${theme.primaryColor || '#3B82F6'} !important;
                --primary-color-hover: ${adjustColorBrightness(theme.primaryColor || '#3B82F6', -10)} !important;
                --primary-color-active: ${adjustColorBrightness(theme.primaryColor || '#3B82F6', -20)} !important;
                --foreground-color: ${theme.foregroundColor || '#FFFFFF'} !important;
                --background-color: ${theme.backgroundColor || '#F9FAFB'} !important;
                --text-color: ${getContrastTextColor(theme.backgroundColor || '#F9FAFB')} !important;
                --card-text-color: ${getContrastTextColor(theme.foregroundColor || '#FFFFFF')} !important;
              }
              
              /* Prevent any flash during loading */
              body { 
                background-color: ${theme.backgroundColor || '#F9FAFB'} !important;
                color: ${getContrastTextColor(theme.backgroundColor || '#F9FAFB')} !important;
                transition: none !important;
              }
              
              /* Ensure all dynamic classes work immediately */
              .bg-primary-dynamic { background-color: ${theme.primaryColor || '#3B82F6'} !important; }
              .bg-foreground-dynamic { background-color: ${theme.foregroundColor || '#FFFFFF'} !important; }
              .bg-background-dynamic { background-color: ${theme.backgroundColor || '#F9FAFB'} !important; }
              .text-primary-dynamic { color: ${theme.primaryColor || '#3B82F6'} !important; }
              .text-text-dynamic { color: ${getContrastTextColor(theme.backgroundColor || '#F9FAFB')} !important; }
              .text-card-text-dynamic { color: ${getContrastTextColor(theme.foregroundColor || '#FFFFFF')} !important; }
            `
          }}
        />
        
        {isThemeLoaded && (
          <div 
            className="min-h-screen bg-background-dynamic text-text-dynamic"
            style={{
              // Double-ensure the background is applied
              backgroundColor: theme.backgroundColor,
              color: getContrastTextColor(theme.backgroundColor)
            }}
          >
            {children}
          </div>
        )}
        
        {/* Loading indicator only shown if theme takes too long */}
        {!isThemeLoaded && (
          <div 
            style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: getContrastTextColor(theme.backgroundColor || '#F9FAFB'),
              fontSize: '14px',
              opacity: 0.7
            }}
          >
            Loading...
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-background-dynamic text-text-dynamic" 
      style={{
        // Ensure CSS variables are available immediately with fallbacks
        backgroundColor: `var(--background-color, ${theme.backgroundColor})`,
        color: `var(--text-color, ${getContrastTextColor(theme.backgroundColor)})`
      }}
    >
      {children}
    </div>
  )
}

/**
 * Adjusts color brightness for hover/active states
 * @param hex - Hex color code
 * @param percent - Percentage to adjust (-100 to 100)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace('#', '')
  
  if (color.length !== 6) return hex // Return original if invalid
  
  // Convert to RGB
  const num = parseInt(color, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent))
  
  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
}

/**
 * Determines appropriate text color (black or white) based on background color
 * Uses luminance calculation for WCAG compliance
 */
function getContrastTextColor(backgroundColor: string): string {
  if (!backgroundColor) return '#000000'
  
  // Remove # if present
  const color = backgroundColor.replace('#', '')
  
  if (color.length !== 6) return '#000000' // Default to black if invalid
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16) 
  const b = parseInt(color.substr(4, 2), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}