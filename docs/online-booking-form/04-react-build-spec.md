# 04 — React Build Spec

A high-level blueprint for the partner-facing React rebuild of the online booking form. Not code — a specification for the engineer building it. The actual implementation lives in a separate repository.

This document assumes you have read `01-existing-system.md`, `02-flow-mapping.md`, and `03-gap-analysis.md`.

---

## Table of Contents

1. [Goals & non-goals](#1-goals--non-goals)
2. [Architecture](#2-architecture)
3. [Token broker — server side](#3-token-broker--server-side)
4. [Frontend stack recommendations](#4-frontend-stack-recommendations)
5. [Screen-by-screen](#5-screen-by-screen)
6. [State shape](#6-state-shape)
7. [API call sequencing](#7-api-call-sequencing)
8. [CardConnect tokenizer integration](#8-cardconnect-tokenizer-integration)
9. [UTM capture](#9-utm-capture)
10. [Error handling](#10-error-handling)
11. [Stubs for known gaps](#11-stubs-for-known-gaps)
12. [Telemetry](#12-telemetry)
13. [Testing checklist](#13-testing-checklist)

---

## 1. Goals & non-goals

### Goals

- A drop-in **multi-step booking widget** Partners can embed in their marketing site (or run as a stand-alone page).
- 100% client-rendered React app driven entirely by the Lead API.
- Customizable via **theme tokens** (colors, fonts, copy) — no fork required for visual changes.
- Resilient to network failures (retry, save state to `localStorage`, recoverable abandons).
- Mobile-first responsive.

### Non-goals

- Replicating the internal CastleQuick admin pipeline indicators (SignalR `leadOnline`, etc.).
- Customer-portal login or "choose existing home" flows.
- Resume-from-emailed-link (`?c=`).
- Anything beyond CardConnect for payments.

---

## 2. Architecture

```
┌────────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│  Visitor browser       │         │  Partner backend      │         │  CastleQuick API      │
│  (React SPA)           │ ◄─────► │  (token broker +      │ ◄─────► │  /token + /api/Lead/* │
│                        │  HTTPS  │   API proxy)          │  HTTPS  │                       │
└────────────────────────┘         └──────────────────────┘         └──────────────────────┘
                                            │
                                            ▼
                                     credentials store
                                     (per-branch API user/pass,
                                      ZIP→branch lookup,
                                      cached access tokens)
```

### Why a backend is mandatory

The Lead API requires `Authorization: Bearer {token}` issued from a `password`-grant against `/token`. Embedding API credentials in the browser would expose them to anyone who views source. **Every Partner deployment needs a small backend** — whether that's a Next.js API route, a Cloudflare Worker, or a dedicated Node/Go service.

The backend's responsibilities:

1. **Hold the long-lived API user credentials** (one set per branch the Partner serves).
2. **Acquire and cache access tokens** from `/token`. Refresh them before they expire.
3. **Resolve which branch's token to use** for a given request, based on the visitor's ZIP (gap §1 workaround).
4. **Proxy** every `/api/Lead/*` call from the SPA, attaching the right `Authorization` header.
5. Optionally enforce rate limits / CAPTCHA / origin checks before forwarding.

### Why not just use a public API key

The Lead API uses OAuth password grant tokens. There is no public-API-key mechanism. The token-broker pattern is the only safe way to consume it from a browser today.

---

## 3. Token broker — server side

### Responsibilities

- **Token cache**: in-memory or Redis. Store `{ access_token, expires_at }` keyed by branch. Refresh at `expires_at - 5 min`.
- **Branch resolution**: given a ZIP, return which branch's token to use. Bootstrap with `GET /api/Lead/PostalCodes` per branch at startup; refresh nightly.
- **Proxy**: forward `POST /api/booking/*` requests from the SPA to `POST /api/Lead/*`, transforming as needed. Recommended path layout:

```
POST /api/booking/calculatePrice          → POST /api/Lead/CalculatePrice
POST /api/booking/createOrUpdate          → POST /api/Lead/CreateOrUpdate
POST /api/booking/createOrUpdateQuote     → POST /api/Lead/CreateOrUpdateQuote
POST /api/booking/bookQuote               → POST /api/Lead/BookQuote
GET  /api/booking/bootstrap?postalCode=   → multi-call bootstrap (see §7)
GET  /api/booking/availability            → GET /api/Lead/Availability
```

The SPA never sees the upstream API directly. Renaming endpoints under `/api/booking/*` insulates Partners from any future Lead API changes.

### Branch routing logic

```
function resolveBranch(postalCode) {
  if (!postalCode) return DEFAULT_BRANCH;
  const trimmed = trimToCountryLength(postalCode);
  return zipToBranchMap[trimmed] ?? OUTSIDE_SERVICE_AREA;
}
```

`OUTSIDE_SERVICE_AREA` is a sentinel — the SPA still gets a token (the default branch's), but the bootstrap response should include `{ outsideServiceArea: true }` so the SPA can show a "we don't serve your area" message.

### Token caching

```
async function getTokenForBranch(branchId) {
  const cached = cache.get(branchId);
  if (cached && cached.expiresAt > now() + 5 * 60 * 1000) {
    return cached.accessToken;
  }
  const fresh = await fetchToken(creds[branchId]);  // POST /token, password grant
  cache.set(branchId, { accessToken: fresh.access_token, expiresAt: now() + fresh.expires_in * 1000 });
  return fresh.access_token;
}
```

---

## 4. Frontend stack recommendations

| Concern | Recommendation | Rationale |
|---|---|---|
| Build | **Vite** + TypeScript | Fast HMR, simple deploys |
| Routing | **TanStack Router** or stateful steps in a single page | The wizard is a single page; routing optional |
| State | **Zustand** or React Context | Form state is bounded and not deeply shared — Redux is overkill |
| Forms | **react-hook-form** + **zod** | Schema validation matches the API's required-field model |
| Data fetching | **TanStack Query** | Caching, retries, background refetch — perfect for the bootstrap data |
| Calendar | **react-day-picker** | Lightweight; the existing form uses Kendo which is heavy and licensed |
| Theming | CSS variables + a Theme Provider | Partners override colors/fonts via a single config object |
| HTTP | **fetch** + a thin wrapper (`apiClient`) | No need for axios |
| Analytics | Whatever the Partner's site uses | UTM capture is built-in, but page-view tracking is the Partner's call |

These are recommendations, not mandates. Anything that produces a single-page React app talking to the token-broker backend over JSON works.

---

## 5. Screen-by-screen

The rebuild keeps the existing form's three-step wizard. Step 4 (portal account) is dropped per scope.

### Screen 1 — Contact + service picker

**Purpose:** capture the visitor's identity, ZIP, and which service they want.

**Inputs:**
- First name (required)
- Last name (required)
- Email (required, format-validated)
- Phone (required, format-validated; the API normalizes formatting)
- Postal code (required; length and label come from the bootstrap response — see §7)
- Scope group (radio cards). If only one group exists, hide and auto-select.
- Scope(s) within the group (checkboxes). If only one scope, auto-select.
- Before-pricing questions for the selected scope(s) (dynamic)
- Source ("How did you hear about us?") — optional, populated from `GET /CustomerSources`
- SMS consent — transactional (checkbox)
- SMS consent — marketing (checkbox)

**Validation:**
- All required fields present
- Postal code matches the country's pattern
- Email passes RFC 5322 light check
- Phone has at least 7 digits
- SMS consent: both required by default; relax if the bootstrap response indicates the tenant has the optional-consent feature

**Submit action:**
Call the token broker's `POST /api/booking/createOrUpdate`. Response gives back `leadId`. Store in app state.

**Edge cases:**
- Outside service area (per bootstrap or per response): show a "We don't currently serve {postalCode}" message but still create the lead so the Partner has the contact info for follow-up.
- Network failure: retry; if persistent, save form state to `localStorage` keyed by a session ID and offer "We saved your info — try again" UI.

### Screen 2 — Frequency + price preview

**Purpose:** show price, let the visitor pick a frequency per scope and add extras.

**Inputs:**
- Per scope: a radio/segment control for the available frequencies (`O`, `W`, `B`, `T`, `M`, etc.)
- Per scope: optional rate-modification toggles (extras like "Inside Fridge", discounts like "First-Time 20% Off")
- Service address (Address1, Address2, City, Region, PostalCode) — pre-fill PostalCode from Screen 1
- During-pricing questions
- (Stub) discount-code field — see §11 §gap 2

**Live behavior:**
On every change (frequency selection, rate-mod toggle, question answer), debounce 300ms and call `POST /api/booking/calculatePrice`. Render the response: per-scope per-frequency `totalRecurringCost`, `totalFirstJobCost`, breakdown of rate modifications.

Display a sticky **Summary** panel showing:
- Selected scopes and their currently-chosen frequency
- "First job" total
- "Recurring" total
- Cheapest line ("From $X / cleaning")

**Submit action:**
Call `POST /api/booking/createOrUpdateQuote` with the lead, scope group, scopes, frequencies, rate-mods, address, and answers. Response gives back `quoteId` (Guid). Store in app state.

### Screen 3 — Schedule + payment + confirm

**Purpose:** pick a date, enter card, book.

**Inputs:**
- Calendar (next 30+ days). Highlight available dates from `GET /api/booking/availability`. Pass `hours` or `amount` from the most-expensive selected line (the API needs one of them; defer to whichever the scope group's `AvailabilityType` requires).
- Time of day (optional; defaults to 09:00)
- After-pricing questions (e.g. "Special instructions for the team")
- Billing address — toggle "Same as service address"
- Payment — CardConnect tokenizer iframe (see §8)
- Per-scope first-job tags (optional, e.g. "Deep Clean") — pull from `GET /Tags?categoryId=6`
- "Book Now" button

**Submit action:**
Call `POST /api/booking/bookQuote` with the lead/quote IDs, scope/frequency `firstJobDate`s, billing terms, CardConnect `token`+`expiry`, and tags. Response confirms the booking; show a thank-you screen.

**Edge cases:**
- CardConnect iframe doesn't post back: surface a clear error, don't lock the UI.
- Booking fails at the API: parse the error and show actionable text. Common causes: ZIP changed and is no longer valid, quote already booked, invalid first-job date.

---

## 6. State shape

Single store. TypeScript shape:

```ts
type BookingState = {
  // Identity
  leadId: number | null;
  quoteId: string | null;        // Guid

  // Bootstrap (cached for the session)
  branding: AboutCompanyDto | null;
  scopeGroups: ScopeGroupDto[];
  customerSources: CustomerSourceDto[];
  billingTerms: BillingTermsDto[];
  tags: TagDto[];                // all categories

  // Branch (after ZIP entered)
  serviceCompanyId: number | null;
  postalCodeInfo: { length: number; label: string; country: string } | null;
  outsideServiceArea: boolean;

  // Step 1
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postalCode: string;
  selectedScopeGroupId: number | null;
  selectedScopeIds: number[];
  beforePricingAnswers: Record<number, string>;     // questionId → answer
  customerSourceId: number | null;
  smsConsentTransactional: boolean;
  smsConsentMarketing: boolean;

  // Step 2
  frequencySelections: Record<number, string>;      // scopeId → frequencyId
  rateModSelections: Record<number, RateModSelection[]>;  // scopeId → list
  duringPricingAnswers: Record<number, string>;
  serviceAddress: Address;
  billingAddress: Address | null;                   // null = same as service
  pricing: CalculatePriceResponse | null;
  discountCode: string | null;                      // gap-stubbed

  // Step 3
  afterPricingAnswers: Record<number, string>;
  firstJobDate: string | null;
  firstJobTimeOfDay: string;                        // default '09:00'
  perScopeFirstJobTagIds: Record<number, number[]>;
  perScopeServiceSetTagIds: Record<number, number[]>;
  cardConnectToken: string | null;
  cardConnectExpiry: string | null;
  billingTermsId: number | null;

  // UTM
  utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };

  // UI
  currentStep: 1 | 2 | 3 | 'success' | 'outside-service-area';
  isSubmitting: boolean;
  lastError: string | null;
};
```

Persist a subset to `localStorage` (everything in Step 1 + Step 2, not card token) so a closed tab is recoverable.

---

## 7. API call sequencing

### Bootstrap (on app mount)

Single backend call that fans out:

```http
GET /api/booking/bootstrap?postalCode={optional}
```

Backend internally calls (in parallel):

```http
GET /api/Lead/AboutCompany
GET /api/Lead/ScopeGroups
GET /api/Lead/CustomerSources
GET /api/Lead/BillingTerms
GET /api/Lead/Tags
```

…using the resolved branch's token. Returns a single bundled response. Saves the SPA five round-trips.

### Per-step calls

| Step | Calls | Trigger |
|---|---|---|
| 1 → submit | `POST /api/booking/createOrUpdate` | Click "Next" |
| 2 → load | `GET /api/booking/rateModifications?scopeGroupId=` + `GET /api/booking/questions?scopeIds=` | On Step 2 enter (or include in bootstrap if scope group is preselected) |
| 2 → live recalc | `POST /api/booking/calculatePrice` | 300ms debounce on any input change |
| 2 → submit | `POST /api/booking/createOrUpdateQuote` | Click "Next" |
| 3 → load | `GET /api/booking/quote?quoteId=` + `GET /api/booking/availability?scopeGroupId=&hours=&startDate=&endDate=` | On Step 3 enter |
| 3 → submit | `POST /api/booking/bookQuote` | Click "Book Now" |

### Pricing call body (canonical)

```json
{
  "postalCode": "90210",
  "scopeGroupId": 3,
  "scopesOfWork": [
    {
      "scopeOfWorkId": 15,
      "frequencyId": "E2",
      "rateModifications": [
        { "rateModificationId": 44, "quantity": 1, "isRecurring": true }
      ]
    }
  ],
  "questions": [
    { "questionId": 101, "answer": "3" },
    { "questionId": 102, "answer": "2" }
  ]
}
```

`questions` is required even on the pricing call — pass an empty array if the user hasn't answered any yet (the API will error with "Missing required questions" if any required question for the selected scopes is unanswered AND has no `ExternalDefaultValue`; the API auto-fills defaults where defined).

---

## 8. CardConnect tokenizer integration

### iframe URL

CardConnect serves the tokenizer at:

- **Production:** `https://fts.cardconnect.com/itoke/ajax-tokenizer.html`
- **UAT:** `https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html`

(See gap §7 — these should ideally come from the API, but today are configuration on the Partner side.)

### Embedding

```html
<iframe id="tokenframe" name="tokenframe" src="{tokenizerUrl}?css={url-encoded-css}&useexpiry=true&usecvv=true"
        scrolling="no" frameborder="0" width="100%" height="100"></iframe>
```

### Token capture

```js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://fts.cardconnect.com' && event.origin !== 'https://fts-uat.cardconnect.com') return;
  try {
    const data = JSON.parse(event.data);
    if (data.message && data.expiry && /^\d+$/.test(data.message)) {
      // success: store token + expiry in app state
      store.setState({ cardConnectToken: data.message, cardConnectExpiry: data.expiry });
    } else if (data.errorCode) {
      // surface tokenization error
    }
  } catch { /* ignore non-JSON messages */ }
});
```

### Pass to booking

```json
{
  "leadId": ...,
  "quoteId": "...",
  ...
  "token": "{cardConnectToken}",
  "expiry": "{cardConnectExpiry}"
}
```

### Handling the "stale CVV" bug

The internal codebase has a bug-fix for "stale iframe CVV error blocking save" (see commit `bffa5bca2`). Mirror the fix in the React app: when validation fails server-side, **destroy and re-mount the iframe** rather than re-using it. Stale iframe state is the most common booking-failure cause.

### ACH (optional)

If the tenant has ACH configured, the API exposes a separate tokenizer URL. The Partner's first version can omit ACH and add it later.

---

## 9. UTM capture

On app mount, parse `window.location.search`:

```ts
const params = new URLSearchParams(location.search);
const utm = {
  source: params.get('utm_source') ?? undefined,
  medium: params.get('utm_medium') ?? undefined,
  campaign: params.get('utm_campaign') ?? undefined,
  term: params.get('utm_term') ?? undefined,
  content: params.get('utm_content') ?? undefined,
};
```

Stash in store. Pass on every `createOrUpdate`, `createOrUpdateQuote`, and `bookQuote` call. The API persists it asynchronously.

If you'd like to attach UTM to a lead **after** an initial submit (e.g. from a popup), use `POST /api/Lead/Utm` with `leadId` (or `email`/`phone`).

---

## 10. Error handling

### API error envelope

The API wraps results in `ApiResponse<T>`:

```json
{ "isSuccess": true, "result": {...}, "message": null, "statusCode": 200, "innerException": null }
```

On failure:

```json
{ "isSuccess": false, "result": null, "message": "Missing required questions: How many bedrooms?", "statusCode": 400 }
```

Plus uncaught 500s are returned **unwrapped** with raw exception text.

### Recommended apiClient

```ts
async function apiCall<T>(path: string, options): Promise<T> {
  const res = await fetch(`/api/booking${path}`, options);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { isSuccess: false, message: text || `HTTP ${res.status}` }; }
  if (body.isSuccess === false || !res.ok) {
    throw new ApiError(body.message ?? 'Unknown error', res.status, body);
  }
  return body.result as T;
}
```

### User-facing error mapping

| API message contains… | Show the user… |
|---|---|
| "Missing required questions:" | The exact list of questions, scrolled into view |
| "Cannot create quote for this lead. Status is booked." | "This quote has already been booked. Start a new estimate." + reset button |
| "FirstJobDate is required" | Highlight calendar |
| "All address fields … are required." | Highlight blank address fields |
| Anything else | Generic "Something went wrong, please try again" + the message in a collapsible "details" |

---

## 11. Stubs for known gaps

For each gap in `03-gap-analysis.md`, the React app should ship with a clearly-marked stub so the Partner doesn't think the feature is broken — and so closing the gap on the API side is a one-line swap.

### Gap §1 — Multi-branch routing

The token broker handles this today. The React app passes `postalCode` to the bootstrap call; the broker resolves the branch. If the broker can't resolve a branch, surface "We don't serve {postalCode}" and **still allow the lead capture** so the Partner has the contact info.

When the API gets `POST /api/group/Lead/CreateOrUpdate`, the broker stops doing per-branch token rotation and uses a single group token instead.

### Gap §2 — Discount code

UI has a `<DiscountCodeInput />` component disabled by default with a tooltip "Coming soon". Behind a feature flag (`enableDiscountCodes: false` in app config), the input shows but the validation hits a Partner-managed mock that returns "Invalid code" for everything. When the API exposes `POST /api/Lead/ApplyDiscountCode`, swap the mock for the real call.

### Gap §3 + §4 — Marketing text / Terms / Testimonials

App config takes a `marketingContent: { perScopeGroup: { [id]: { html, terms, testimonials } } }` that the Partner populates from their own CMS. When the API exposes per-group marketing endpoints, replace the static lookup with API calls.

### Gap §5 — SMS consent

The React app **collects** the two consent checkboxes (required by default) and **sends them to the token broker**. The broker logs them to its own audit table. They are **not** forwarded to the Lead API today. When the API accepts these fields, forward them.

### Gap §6 — Modify a draft quote

If the visitor hits "Back" from Step 3 and changes their scope/frequency selection, re-call `POST /api/booking/createOrUpdateQuote` with `sendQuoteEmail: false` to overwrite. Don't call any deselect/remove endpoint.

### Gap §7 — CardConnect tokenizer URL

Hard-coded per environment in app config:

```ts
{ env: 'production', cardConnectTokenizerUrl: 'https://fts.cardconnect.com/itoke/ajax-tokenizer.html' }
{ env: 'uat',        cardConnectTokenizerUrl: 'https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html' }
```

Replace with `GET /api/Lead/PaymentConfig` when available.

### Gap §8 — Outside service area boolean

Token broker calls `GET /PostalCodes` per branch at startup, builds an in-memory ZIP-to-branch map, and returns `outsideServiceArea: true` in the bootstrap response if no branch matches. SPA shows the appropriate message.

### Gaps §9 §10 §11 — minor

App ignores. When the API adds them, surface in the relevant calls.

---

## 12. Telemetry

Recommend the Partner instrument:

- `booking_started` (Step 1 view)
- `booking_step_completed` { step, durationMs }
- `booking_price_recalculated` { totalRecurringCost, totalFirstJobCost }
- `booking_dropped` { lastStep, reason } — fire on `beforeunload` if not booked
- `booking_completed` { quoteId, leadId }
- `booking_error` { step, message, statusCode }

Rolling these into the Partner's existing analytics pipeline is enough — the booking widget should NOT phone home to CastleQuick directly.

---

## 13. Testing checklist

A version of the booking widget is "ready to ship" when all of these pass:

### Happy path

- [ ] Single-branch tenant: visitor goes from cold landing → booked in under 2 minutes.
- [ ] Multi-branch tenant: visitor's ZIP routes to the right branch (verified in CastleQuick admin).
- [ ] CardConnect token captured and booking succeeds end-to-end.
- [ ] Booking confirmation email arrives at the visitor's inbox within 2 minutes.

### Edge cases

- [ ] Outside service area: lead is captured, "we don't serve this area" UI shown, no booking flow offered.
- [ ] Visitor closes tab in Step 2, reopens link: form state restored from localStorage, can continue.
- [ ] CardConnect iframe times out: error surfaced, iframe re-mounted on retry.
- [ ] Required question unanswered → API rejects with "Missing required questions": exact questions highlighted.
- [ ] Visitor changes ZIP mid-flow to a ZIP in a different branch: branch routing recalculates, lead is created in the right branch (note: existing lead in old branch is orphaned — document this as known behavior).
- [ ] SMS consent unchecked: form blocks submit (unless tenant has optional-consent feature).

### Multi-frequency

- [ ] Visitor selects two scopes with different frequencies: prices shown per scope, booking creates two job series.

### Network resilience

- [ ] API returns 500 on `bookQuote`: error shown, retry possible without re-tokenizing card.
- [ ] Token broker times out: SPA retries with exponential backoff; user sees a "We're having trouble" message after 3 failed attempts.

### Visual

- [ ] Mobile (320px – 768px): all controls reachable, no horizontal scroll.
- [ ] Theme override: changing the primary color via the theme prop changes all branded UI.
- [ ] No layout shift when prices recalc.

---

## What the Partner gets out of the box

A working CardConnect-based booking widget that runs against the Lead API as it exists today, with documented stubs for each gap and a clear path to swap stubs for real API calls as `03-gap-analysis.md` items get built.

## What the Partner is responsible for

- Hosting the token broker (small Node/Next.js/Worker service).
- Holding the API user credentials securely (env vars + secret manager).
- Supplying their own marketing copy / terms / testimonials until those API endpoints exist.
- Their own analytics instrumentation.
- Mapping their site's branding into the widget's theme tokens.

## What CastleQuick needs to build for full parity

In rough priority order — see `03-gap-analysis.md` for details:

1. Group-scoped Lead API (`/api/group/Lead/*`) — closes Critical gap §1.
2. `POST /api/Lead/ApplyDiscountCode` — closes Critical gap §2.
3. SMS consent fields on lead/quote/book DTOs — closes Critical gap §5.
4. `POST /api/Lead/RemoveScopeFromQuote` and `DeselectFrequency` — closes Important gap §6.
5. `GET /api/Lead/PaymentConfig` — closes Important gap §7.
6. Per-scope-group marketing/terms/testimonials endpoints — closes Important gaps §3 + §4.
7. Minor improvements (`outsideServiceArea` flag, `ipAddress`, lead-email delay, default-tag policy).
