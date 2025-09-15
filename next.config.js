/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    turbo: {
      // Turbopack configuration if needed
    },
  },
  
  // Configure headers to allow API requests
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' ws: wss: https://api.maidcentral.net https://mccleaners.maidcentral.net", // Allow MaidCentral API
              "frame-ancestors 'self' *", // Allow iframe embedding
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;