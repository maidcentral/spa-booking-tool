"use client"

/**
 * Iframe debugging utilities for development and troubleshooting
 */

export interface IframeContext {
  isInIframe: boolean
  parentOrigin: string | null
  referrer: string
  selfOrigin: string
  hasPostMessageSupport: boolean
  securityPolicy: {
    frameAncestors: string | null
    xFrameOptions: string | null
  }
}

/**
 * Detects if the application is running inside an iframe
 */
export function detectIframeContext(): IframeContext {
  if (typeof window === 'undefined') {
    return {
      isInIframe: false,
      parentOrigin: null,
      referrer: '',
      selfOrigin: '',
      hasPostMessageSupport: false,
      securityPolicy: {
        frameAncestors: null,
        xFrameOptions: null
      }
    }
  }

  const isInIframe = window.self !== window.top
  let parentOrigin: string | null = null

  // Safely detect parent origin
  try {
    parentOrigin = window.parent !== window.self ? document.referrer : null
  } catch (error) {
    // Cross-origin access blocked - we're definitely in an iframe
    parentOrigin = 'blocked-cross-origin'
  }

  return {
    isInIframe,
    parentOrigin,
    referrer: document.referrer,
    selfOrigin: window.location.origin,
    hasPostMessageSupport: typeof window.postMessage === 'function',
    securityPolicy: {
      frameAncestors: null, // Will be filled by CSP check
      xFrameOptions: null   // Will be filled by header check
    }
  }
}

/**
 * Enhanced iframe debugging for development mode
 */
export class IframeDebugger {
  private context: IframeContext
  private debugMode: boolean

  constructor() {
    this.context = detectIframeContext()
    this.debugMode = process.env.NODE_ENV === 'development'
    
    if (this.debugMode) {
      this.logIframeContext()
      this.checkSecurityHeaders()
      this.setupErrorListeners()
    }
  }

  /**
   * Logs detailed iframe context information
   */
  private logIframeContext() {
    
    if (this.context.isInIframe) {
      this.checkIframeCompatibility()
    } else {
    }
    
  }

  /**
   * Checks iframe compatibility and potential issues
   */
  private checkIframeCompatibility() {
    const issues: string[] = []
    const warnings: string[] = []

    // Check for same-origin issues
    if (this.context.parentOrigin === 'blocked-cross-origin') {
      warnings.push('Cross-origin iframe detected - some features may be restricted')
    }

    // Check for localhost development
    if (this.context.selfOrigin.includes('localhost')) {
    }

    // Check referrer policy
    if (!this.context.referrer && this.context.isInIframe) {
      warnings.push('No referrer information available - may indicate strict referrer policy')
    }

    if (issues.length > 0) {
    }

    if (warnings.length > 0) {
    }

    if (issues.length === 0 && warnings.length === 0) {
    }
  }

  /**
   * Checks security headers that might affect iframe embedding
   */
  private async checkSecurityHeaders() {
    try {
      const response = await fetch(window.location.href, { method: 'HEAD' })
      const headers = response.headers

      
      // Check CSP
      const csp = headers.get('content-security-policy')
      if (csp) {
        
        if (csp.includes('frame-ancestors')) {
          const frameAncestors = csp.match(/frame-ancestors\s+([^;]+)/)?.[1]
          
          if (frameAncestors?.includes('none')) {
          } else if (frameAncestors?.includes('*')) {
          } else {
          }
        }
      } else {
      }

      // Check X-Frame-Options
      const xFrameOptions = headers.get('x-frame-options')
      if (xFrameOptions) {
        
        if (xFrameOptions.toLowerCase() === 'deny') {
        } else if (xFrameOptions.toLowerCase() === 'sameorigin') {
        } else {
        }
      } else {
      }

    } catch (error) {
    }
  }

  /**
   * Sets up error listeners for iframe-related issues
   */
  private setupErrorListeners() {
    // Listen for security policy violations
    window.addEventListener('securitypolicyviolation', (event) => {
      if (event.violatedDirective.includes('frame-ancestors')) {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          originalPolicy: event.originalPolicy
        })
      }
    })

    // Listen for general errors that might be iframe-related
    window.addEventListener('error', (event) => {
      if (this.context.isInIframe) {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          error: event.error
        })
      }
    })

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.context.isInIframe) {
      }
    })
  }

  /**
   * Tests iframe communication capabilities
   */
  public testIframeCommunication() {
    if (!this.context.isInIframe) {
      return
    }

    
    try {
      // Test postMessage to parent
      window.parent.postMessage({
        type: 'MAIDCENTRAL_IFRAME_TEST',
        timestamp: Date.now(),
        origin: window.location.origin
      }, '*')
      
    } catch (error) {
    }
    
  }

  /**
   * Gets current iframe context
   */
  public getContext(): IframeContext {
    return this.context
  }

  /**
   * Logs theme URL parameters for debugging
   */
  public logThemeParameters() {
    if (!this.debugMode) return

    const params = new URLSearchParams(window.location.search)
    const themeParams = {
      primary: params.get('primary') || params.get('primaryColor'),
      foreground: params.get('foreground') || params.get('foregroundColor'),
      background: params.get('background') || params.get('backgroundColor')
    }

    
    // Validate parameters
    Object.entries(themeParams).forEach(([key, value]) => {
      if (value) {
        const isValid = /^[0-9a-fA-F]{6}$/.test(value.replace('#', ''))
      } else {
      }
    })
    
  }
}

// Auto-initialize in development (client-side only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Ensure DOM is ready before initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeIframeDebugger()
    })
  } else {
    initializeIframeDebugger()
  }
  
  function initializeIframeDebugger() {
    try {
      const iframeDebugger = new IframeDebugger()
      
      // Make debugger available globally for console debugging
      ;(window as any).iframeDebugger = iframeDebugger
      
      // Auto-test communication after a short delay
      setTimeout(() => {
        iframeDebugger.testIframeCommunication()
        iframeDebugger.logThemeParameters()
      }, 1000)
    } catch (error) {
    }
  }
}

export default IframeDebugger