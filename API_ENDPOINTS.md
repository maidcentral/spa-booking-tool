# MaidCentral API endpoints used by this sample

Every MaidCentral endpoint hit by this application. Listed in roughly the order
a booking session touches them.

Base URL: `NEXT_PUBLIC_API_BASE_URL` from `.env.local` — typically
`https://api.maidcentral.com` (production) or `https://api.maidcentral.net`
(staging).

All authenticated endpoints expect `Authorization: Bearer <token>` where
`<token>` is an access token from `/token`.

---

## Authentication

### `POST /token`
OAuth2 password grant. Exchange `API_USERNAME` / `API_KEY` for a bearer token.

- **Content-Type:** `application/x-www-form-urlencoded`
- **Body:** `username`, `password` (the API key), `grant_type=password`
- **Response:** `{ access_token, token_type, expires_in, ... }`
- **Called from:** `app/api/auth/route.ts` (server-side only, so `API_KEY`
  never leaves the server).

---

## Catalog / configuration (read)

### `GET /api/Lead/ScopeGroups`
Top-level service categories and their scopes + frequencies.

- **Called from:** `app/services/api/booking-data.ts → getScopeGroups`
- **Used by:** service selection step (`components/booking/steps/ServiceSelection.tsx`)

### `GET /api/Lead/Questions?scopeIds=<id>&scopeIds=<id>…`
Dynamic customization questions per scope.

- **Called from:** `booking-data.ts → getQuestions`
- **Used by:** customization section of `SinglePageBookingFlow`

### `GET /api/Lead/RateModifications?scopeGroupId=<id>`
Add-ons / discounts available for a scope group.

- **Called from:** `booking-data.ts → getRateModifications`

### `GET /api/Lead/PostalCodes`
Service-area postal codes + their zone mapping. Used to validate whether a
customer's ZIP is serviceable and to assign a zone for availability lookup.

- **Called from:** `booking-data.ts → getPostalCodes`

### `GET /api/Lead/Availability?scopeGroupId=<id>&hours=<n>&startDate=<iso>&endDate=<iso>`
Returns bookable dates in the requested window.

- **Called from:** `booking-data.ts → getAvailability`

---

## Pricing

### `POST /api/Lead/CalculatePrice`
Real-time quote for the selected scope + frequency + rate modifications +
question answers.

- **Called from:** `booking-data.ts → calculatePrice`, invoked from
  `BookingContext.tsx` when the user's selections change.
- **Response shape used for display:**
  `response.Result[0].Frequencies[0].AdjustedBaseCost` — the post-modification
  sticker price the customer sees.
- **Response shape used for BookQuote:**
  `response.Result[0].Frequencies[0].CalculatedBaseCost` — the pre-modification
  base fee, stored in `BookingPricing.baseFee` and sent as the `BaseFee` field
  of `BookQuote.ScopesOfWork[n]` so the server re-applies rate modifications
  without double-counting.

---

## Lead + quote + booking

### `POST /api/Lead/CreateOrUpdate`
Create or update a lead. First write-side call in the flow.

- **Called from:** `app/services/api/lead.ts → createOrUpdate`, invoked from
  `SinglePageBookingFlow` when the customer clicks save.
- **Response:** `{ IsSuccess, Result: { LeadId, … } }`

### `POST /api/Lead/CreateOrUpdateQuote`
Attach a priced quote (scopes, frequencies, rate modifications, questions,
tokenized payment method) to the lead.

- **Called from:** `lead.ts → createOrUpdateQuote`
- **Response:** `{ IsSuccess, Result: { QuoteId, … } }`

### `POST /api/Lead/BookQuote`
Final booking confirmation. Captures the payment via the processor, so this
request can take substantially longer than others — the client timeout is
120 seconds.

- **Called from:** `app/services/api/bookquote.ts → bookQuote`
- **Required fields:** `LeadId`, `QuoteId`, `Token` + `Expiry` (payment
  tokenization output), `ScopeGroupId`, `ScopesOfWork[]` with `BaseFee` and
  `FirstJobDate`, plus home + billing addresses.

---

## Reference data (available but not wired into the default flow)

### `GET /api/Lead/CustomerSources`
Available "How did you hear about us?" options.

- **Called from:** `lead.ts → getCustomerSources`
- **Note:** Helper is exported; add to your form if you want to attribute leads.

### `GET /api/Lead/Tags`
Lead tags. The helper filters to `CategoryId === 8` per MaidCentral convention.

- **Called from:** `lead.ts → getLeadTags`

---

## Adding new endpoints

If you need an endpoint that isn't listed here:

1. Confirm the exact path and payload shape with MaidCentral support — do not
   guess from naming conventions.
2. Add it to `app/services/api/` following the pattern of sibling modules
   (bearer auth via `authHeaders()`, envelope-unwrapping, descriptive errors).
3. Document it in this file so future readers know what's in use.
