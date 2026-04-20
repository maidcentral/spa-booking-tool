# MaidCentral Booking Tool

A reference Next.js application that demonstrates how to build a customer-facing
booking form on top of the MaidCentral API. Clone it, plug in your partner
credentials, and you have a working online booking widget — or use the code as
a reference for integrating MaidCentral into your own stack.

Built with Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS v4,
and Radix UI primitives.

---

## What this sample demonstrates

1. **Server-side authentication.** `app/api/auth/route.ts` exchanges your
   `API_USERNAME` / `API_KEY` for a bearer token using MaidCentral's `/token`
   endpoint. Credentials stay on the server; the client only ever sees the
   short-lived token.
2. **Service selection from `ScopeGroups`.** Users pick a service category
   (`ScopeGroup`) and a specific scope from live API data.
3. **Dynamic customization.** Rate modifications, questions, and frequency
   options are loaded per-scope via `RateModifications`, `Questions`, and the
   scope's `Frequencies`.
4. **Live pricing.** The `CalculatePrice` endpoint returns `AdjustedBaseCost`
   which drives the quote summary.
5. **Address / availability / payment.** `PostalCodes` validates the service
   area, `Availability` returns bookable dates, and CardConnect tokenizes the
   payment method client-side (the raw card number never touches our server).
6. **Lead → Quote → Book.** Three API calls finalize the booking:
   `CreateOrUpdate` (lead), `CreateOrUpdateQuote` (priced quote), and
   `BookQuote` (confirmation + payment capture).

See [`API_ENDPOINTS.md`](./API_ENDPOINTS.md) for the full endpoint inventory
and where each call lives in the code.

---

## Quick start

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd maidcentral-booking-tool
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in:

   - `API_USERNAME` / `API_KEY` — request these from MaidCentral support
     (`support@maidcentral.com`). They are machine credentials, distinct from
     your user login.
   - `NEXT_PUBLIC_API_BASE_URL` — `https://api.maidcentral.com` for production,
     `https://api.maidcentral.net` for staging. **Required** — the app throws
     at startup if this is unset.
   - `NEXT_PUBLIC_CARDCONNECT_ENV` — `uat` (test cards, no charges) or
     `production` (real transactions). Defaults to `uat` so a fresh clone
     never charges real cards.
   - `NEXT_PUBLIC_MULTI_STEP_LAYOUT` — `true` renders the 3-step wizard
     (About you → Home & pricing → Schedule & book), `false` renders the
     single-page form. Defaults to `false`. Can be overridden per-request
     with the `?layout=multi-step` or `?layout=single-page` URL parameter,
     which is useful for A/B testing both layouts from one deployment.

3. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

---

## Architecture map

```
app/
├── page.tsx                          Entry point
├── components/booking/
│   ├── AuthenticationProvider.tsx    Fetches token via /api/auth on mount
│   ├── EmbeddableBookingForm.tsx     Thin wrapper — the iframe-friendly entry
│   ├── SinglePageBookingFlow.tsx     The main booking UI — service → customize → schedule → checkout
│   ├── CardConnectTokenizer.tsx      PCI-compliant payment iframe
│   ├── CustomerDetailsForm.tsx       Address + contact form
│   ├── PricingSummary.tsx            Quote display (uses AdjustedBaseCost)
│   └── steps/ServiceSelection.tsx    Scope group + scope picker
├── api/
│   └── auth/route.ts                 Server-side /token exchange (keeps API_KEY off the wire)
├── services/api/
│   ├── fetch-utils.ts                Bearer-authed fetch wrapper with timeout
│   ├── booking-data.ts               ScopeGroups, Questions, CalculatePrice, Availability, PostalCodes, RateModifications
│   ├── lead.ts                       CreateOrUpdate, CreateOrUpdateQuote, CustomerSources, Tags
│   └── bookquote.ts                  BookQuote (final confirmation + payment)
├── contexts/BookingContext.tsx       Form state + pricing processing
├── lib/config/
│   ├── api-url.ts                    Single source of truth for NEXT_PUBLIC_API_BASE_URL
│   └── env.ts                        Other env helpers
└── types/                            Shared TS types
```

### Request lifecycle

```
Browser                    Next.js server                MaidCentral API
───────                    ──────────────                ───────────────
AuthenticationProvider ─▶  GET /api/auth          ─────▶ POST /token
                       ◀── { token }              ◀─────
SinglePageBookingFlow  ─▶                          ─────▶ GET /api/Lead/ScopeGroups
                       ──────────────────────────▶       GET /api/Lead/Questions
                       ──────────────────────────▶       GET /api/Lead/RateModifications
                       ──────────────────────────▶       POST /api/Lead/CalculatePrice
                       ──────────────────────────▶       GET /api/Lead/PostalCodes
                       ──────────────────────────▶       GET /api/Lead/Availability
                       ──────────────────────────▶       POST /api/Lead/CreateOrUpdate
                       ──────────────────────────▶       POST /api/Lead/CreateOrUpdateQuote
                       ──────────────────────────▶       POST /api/Lead/BookQuote
CardConnect iframe     ─────────────────────────────────▶ fts.cardconnect.com (payment token)
```

---

## Embedding

The form is designed to be iframe-friendly. After deploying, embed it anywhere:

```html
<iframe
  src="https://your-deployment.example.com"
  width="100%"
  height="900"
  frameborder="0"
  title="Book your cleaning">
</iframe>
```

The CSP in `middleware.ts` already allows embedding from any origin via
`frame-ancestors *`. Tighten this for production if you only embed from a
single site.

---

## Customizing for your business

- **Different payment provider?** Replace `CardConnectTokenizer.tsx` and
  `app/config/cardconnect.ts`. Update the `frame-src` CSP entries in
  `middleware.ts` and `next.config.js` to whitelist your provider's iframe host.
- **Different API host?** Change `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. If
  you point at a host outside `api.maidcentral.{com,net}`, also update the
  `connect-src` CSP entries.
- **Branding.** Theme tokens live in `app/globals.css` as CSS variables. The
  `PricingSummary` and step components consume them so you can restyle without
  touching component code.
- **Layout.** Two layouts ship in the box:
  - **Single-page** (default): all sections scroll together on one page.
    Implemented by `app/components/booking/SinglePageBookingFlow.tsx`.
  - **Multi-step wizard**: three steps — 1) About you (contact + ZIP),
    2) Home & pricing (service + customization + address + quote),
    3) Schedule & book (date + time + payment). Implemented in
    `app/components/booking/multistep/`. Set `NEXT_PUBLIC_MULTI_STEP_LAYOUT=true`
    to make it the default, or use `?layout=multi-step` on the URL to toggle
    per-session (handy for A/B testing). The multi-step flow creates the
    lead on Step 1 so partial abandonment still produces a lead record.

---

## Troubleshooting

### Startup error: `NEXT_PUBLIC_API_BASE_URL is not set`
Add it to `.env.local`. The app intentionally refuses to boot without it rather
than silently defaulting to a host you might not expect.

### 400 on `/token`
The `/token` endpoint requires `application/x-www-form-urlencoded` body
(`username`, `password=<API_KEY>`, `grant_type=password`). The server route at
`app/api/auth/route.ts` shows the exact shape.

### Authenticated calls hit a CORS wall
The CSP `connect-src` directive in `middleware.ts` only whitelists
`api.maidcentral.com` and `api.maidcentral.net`. Using a different host?
Add it there.

### BookQuote times out
BookQuote is the only request that synchronously processes payment, and the
staging environment can take 30 s+. The client timeout in
`app/services/api/bookquote.ts` is set to 120 seconds for this reason.

### Pricing shows "$NaN" or zero
Inspect the `CalculatePrice` response in Network tab. The app expects the
envelope shape `{ IsSuccess, Result: [{ Frequencies: [{ AdjustedBaseCost }] }] }`.
See `processApiResponseToLineItems` in `app/contexts/BookingContext.tsx`.

---

## Support

- MaidCentral API access, credentials, rate limits → `support@maidcentral.com`
- Booking tool code issues → file a GitHub issue on this repo
