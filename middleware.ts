import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next()
  
  // Detect development mode
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1'
  
  // Enhanced logging for iframe embedding issues
  if (isDevelopment) {
  }

  // Security headers for iframe context (relaxed for development)
  const securityHeaders: Record<string, string> = {
    // Content Security Policy optimized for iframe embedding
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (isDevelopment ? " 'unsafe-eval'" : ""), // Add unsafe-eval for dev mode
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow Google Fonts and inline styles for theming
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.maidcentral.net https://mccleaners.maidcentral.net" + (isDevelopment ? " ws: wss: http://localhost:* https://localhost:*" : ""), // Allow MaidCentral API and dev server connections
      "frame-ancestors " + (isDevelopment ? "*" : "*"), // Allow embedding in any iframe (required for partner sites)
      "frame-src 'self' https://fts-uat.cardconnect.com https://fts.cardconnect.com", // Allow CardConnect payment iframes
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
      // Remove upgrade-insecure-requests in development to allow http://localhost
    ].filter(Boolean).join('; ') + (isDevelopment ? "" : "; upgrade-insecure-requests"),

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection (legacy but still useful)
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy for privacy (more permissive in development)
    'Referrer-Policy': isDevelopment ? 'no-referrer-when-downgrade' : 'strict-origin-when-cross-origin',

    // Permissions Policy to limit browser features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'bluetooth=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()'
    ].join(', '),

    // Cache control for static assets (no-cache in development for better debugging)
    'Cache-Control': isDevelopment 
      ? 'no-cache, no-store, must-revalidate'
      : request.nextUrl.pathname.startsWith('/_next/static')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache, no-store, must-revalidate',

    // Additional security headers (relaxed in development)
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen'
  }
  
  // Only add HSTS in production with HTTPS
  if (!isDevelopment && request.nextUrl.protocol === 'https:') {
    securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Enhanced CORS headers for iframe embedding (especially for localhost development)
  if (request.method === 'GET') {
    // Remove X-Frame-Options since we're using CSP frame-ancestors
    // X-Frame-Options conflicts with CSP in modern browsers
    
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    // Handle CORS for iframe embedding
    if (origin) {
      // In development, allow any localhost origin
      if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      } else {
        // In production, allow all origins for iframe embedding
        response.headers.set('Access-Control-Allow-Origin', '*')
      }
      
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
      response.headers.set('Access-Control-Max-Age', '86400')
    }
    
  }

  // Enhanced OPTIONS handling for CORS preflight
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const allowOrigin = isDevelopment && origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ? origin
      : '*'
      
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
        ...(allowOrigin !== '*' ? { 'Access-Control-Allow-Credentials': 'true' } : {})
      }
    })
  }

  return response
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}