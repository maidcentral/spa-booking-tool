// URL parameter utilities for theme extraction

/**
 * Extract color parameters from various sources
 */
export function extractUrlParams(): URLSearchParams {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search)
  }
  
  // Server-side fallback - return empty params
  return new URLSearchParams()
}

/**
 * Get a specific color parameter with fallback
 */
export function getColorParam(key: string, fallback: string = ''): string {
  try {
    const params = extractUrlParams()
    return params.get(key) || fallback
  } catch (error) {
    return fallback
  }
}

/**
 * Get all color parameters as an object
 */
export function getAllColorParams(): Record<string, string> {
  try {
    const params = extractUrlParams()
    return {
      foreground: params.get('foreground') || '',
      background: params.get('background') || '',
      primary: params.get('primary') || ''
    }
  } catch (error) {
    return {
      foreground: '',
      background: '',
      primary: ''
    }
  }
}

/**
 * Update URL parameters without page refresh (client-side only)
 */
export function updateUrlParams(params: Record<string, string>): void {
  if (typeof window === 'undefined') return
  
  try {
    const url = new URL(window.location.href)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    
    // Update URL without page refresh
    window.history.replaceState({}, '', url.toString())
  } catch (error) {
  }
}

/**
 * Check if we're currently in an iframe
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top
  } catch (error) {
    // If we can't access window.top due to cross-origin restrictions, 
    // we're likely in an iframe
    return true
  }
}

/**
 * Get the referrer URL if in an iframe (for logging)
 */
export function getIframeReferrer(): string | null {
  try {
    if (isInIframe()) {
      return document.referrer || null
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Safe parameter parsing that handles edge cases
 */
export function safeParseParams(searchString: string): URLSearchParams {
  try {
    // Handle various edge cases in URL parsing
    const cleanSearchString = searchString
      .replace(/^\?/, '') // Remove leading ?
      .replace(/[<>'"]/g, '') // Remove potentially harmful characters
      .trim()
    
    return new URLSearchParams(cleanSearchString)
  } catch (error) {
    return new URLSearchParams()
  }
}