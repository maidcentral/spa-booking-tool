# Partner setup guide

Shortest path from zero to a working booking form.

## Prerequisites

- Node.js 18 or newer
- MaidCentral partner API credentials (request from `support@maidcentral.com`
  — these are machine credentials, not your user login)

## Setup

```bash
git clone <your-repo-url>
cd maidcentral-booking-tool
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
API_USERNAME=MC.your_username
API_KEY=your_api_key
NEXT_PUBLIC_API_BASE_URL=https://api.maidcentral.com
```

Run it:

```bash
npm run dev
```

Visit http://localhost:3000.

## How authentication works

1. On mount, `AuthenticationProvider` calls the local `GET /api/auth` route.
2. That route (server-side, so `API_KEY` never reaches the browser) POSTs
   to MaidCentral's `/token` endpoint with the API credentials.
3. The returned bearer token is passed to the client and attached as
   `Authorization: Bearer …` on all subsequent MaidCentral API calls.

No SMS / phone code step is required — these are machine credentials.

## Deploying

Any host that runs Next.js works (Vercel, Netlify, AWS, Railway, a Docker
container). Set these environment variables on your hosting platform:

| Variable | Required | Notes |
|---|---|---|
| `API_USERNAME` | Yes | Server-only. Do not prefix with `NEXT_PUBLIC_`. |
| `API_KEY` | Yes | Server-only. |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Production: `https://api.maidcentral.com` |
| `NEXT_PUBLIC_CARDCONNECT_ENV` | No | `uat` (default, test cards) or `production` |
| `NEXT_PUBLIC_MULTI_STEP_LAYOUT` | No | `false` (default, single-page) or `true` (3-step wizard). Override per-request with `?layout=multi-step` / `?layout=single-page` |
| `NEXT_PUBLIC_PARTNER_ID` | No | Tag outbound requests with a partner ID |

### Build + start

```bash
npm run build
npm start
```

## Embedding on your website

```html
<iframe
  src="https://your-deployment.example.com"
  width="100%"
  height="900"
  frameborder="0"
  title="Book your cleaning">
</iframe>
```

The CSP in `middleware.ts` already allows embedding on any origin via
`frame-ancestors *`. Restrict this to your specific domain(s) before going to
production if desired.

## Payment processing

The sample ships with a CardConnect integration
(`app/components/booking/CardConnectTokenizer.tsx`,
`app/config/cardconnect.ts`). Environment is controlled by
`NEXT_PUBLIC_CARDCONNECT_ENV`:

- `uat` (default) — talks to `fts-uat.cardconnect.com`. Test card numbers
  only; no charges are captured. Use this throughout development.
- `production` — talks to `fts.cardconnect.com`. Real transactions. Only
  switch after your merchant account is live.

If your MaidCentral account is configured with a different processor, you'll
need to swap the tokenizer component and update the `frame-src` directive in
`middleware.ts` and `next.config.js` to whitelist your provider's iframe host.

## Troubleshooting

**App throws `NEXT_PUBLIC_API_BASE_URL is not set` at startup.**
Add it to `.env.local` and restart the dev server.

**`/token` returns 400.**
Double-check `API_USERNAME` (starts with `MC.` followed by a hex string) and
`API_KEY`. Both are sent as a form-urlencoded body — see
`app/api/auth/route.ts` for the exact request shape.

**Services aren't loading.**
Open the Network tab in DevTools. You should see a successful `GET /api/auth`
(local proxy) followed by `GET /api/Lead/ScopeGroups`. If the first fails,
credentials are the issue. If the second fails, check that
`NEXT_PUBLIC_API_BASE_URL` points to the right host and that your account has
active scope groups.

**BookQuote times out.**
BookQuote captures payment synchronously and can be slow on staging. The
client already allows 120 seconds. If it's still timing out, the server-side
payment gateway call is failing — contact MaidCentral support with the lead
and quote IDs from the Network tab.

## Support

- MaidCentral API: `support@maidcentral.com`
- This booking tool: file a GitHub issue on the repo
