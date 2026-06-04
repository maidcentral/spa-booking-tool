/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      "font-src 'self' fonts.gstatic.com",
      "img-src 'self' data: blob:",
      // MaidCentral API (production + staging). Update if you target a different host.
      "connect-src 'self' ws: wss: https://api.maidcentral.com https://api.maidcentral.net",
      // CardConnect payment iframes (remove if you use a different payment provider).
      "frame-src 'self' https://fts-uat.cardconnect.com https://fts.cardconnect.com",
      "frame-ancestors 'self' *",
    ];

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;