# Lead API Reference

**Controller:** `CastleKeeper.Web/Areas/Api/Controllers/LeadController.cs`
**Base path:** `/api/Lead/`
**Audience:** Developers (human or AI) building external lead-capture forms, online booking forms, and pricing widgets against CastleQuick/MaidCentral.

This document is the authoritative reference for the `/api/Lead/` surface. It assumes **no prior knowledge** of the CastleQuick domain. Read the **Concepts** section first.

---

## Table of Contents

1. [Concepts & Glossary](#1-concepts--glossary)
2. [Base URLs](#2-base-urls)
3. [Authentication](#3-authentication)
4. [Multi-Tenancy](#4-multi-tenancy)
5. [Request & Response Conventions](#5-request--response-conventions)
6. [Workflow A: Lead Form Post](#6-workflow-a-lead-form-post)
7. [Workflow B: Online Booking Form](#7-workflow-b-online-booking-form)
8. [Endpoint Reference](#8-endpoint-reference)
9. [Data Schemas](#9-data-schemas)
10. [Enumerations & Magic Values](#10-enumerations--magic-values)
11. [Side Effects](#11-side-effects)
12. [Errors](#12-errors)

---

## 1. Concepts & Glossary

CastleQuick (also branded MaidCentral) manages the lifecycle of a home-service sale: **capture lead → quote services → book jobs → deliver service**. The Lead API exposes only the first three steps.

| Term | Meaning |
|---|---|
| **ServiceCompany** | A single branch/location. The base scoping unit for all data. Identified by `ServiceCompanyId`. Derived from the auth token; never passed in the request body. |
| **ServiceCompanyGroup** | A tenant (a company's group of branches). Identified by `ServiceCompanyGroupId`. Also derived from the token. |
| **Lead** | A person who has shown interest. Captured as a `tblCustomerQuote` row with `QuoteStatusId < 9`. Identified by `LeadId` (the API alias for `CustomerQuoteId`). |
| **Quote** | A priced proposal attached to a lead. Identified by a `QuoteId` (a `Guid`, the API alias for `CustomerQuoteDetailGroupId`). One lead can have multiple quotes over time. |
| **Scope Group** | A logical grouping of services offered to a customer type — e.g. "Residential Cleaning", "Carpet Cleaning". The customer picks one Scope Group per quote. Identified by `ScopeGroupId`. |
| **Scope (Scope of Work)** | A specific service within a Scope Group — e.g. "Standard Clean", "Deep Clean". One quote can include multiple scopes. Identified by `ScopeId` (also called `ScopeOfWorkId`). |
| **Frequency** | How often the scope is performed — e.g. weekly, every 2 weeks, one-time. Represented by a short string abbreviation (`FrequencyId`). See [FrequencyId](#frequencyid). |
| **Rate Modification** | An add-on, extra, or discount applied to a scope — e.g. "Inside Fridge +$25", "First-Time 20% Off". Identified by `RateModificationId`. |
| **Question** | A dynamic survey item attached to a scope — e.g. "How many bedrooms?". Questions can be `BeforePricing`, `DuringPricing`, or `AfterPricing`. Identified by `QuestionId`. Answers flow back as `ApiQuoteQuestionDto`. |
| **Booking** | Converting a quote into a scheduled customer + job(s). Triggered by `POST /api/Lead/BookQuote`. After booking the lead becomes a `Customer` (`CustomerInformationId`) and gets one or more `Job` records. |
| **Quote Status** | An integer stage value on the lead/quote. `StatusId >= 9` means the quote is **booked** and cannot be edited or re-quoted. See [QuoteStatusId](#quotestatusid). |
| **Tag** | A categorized label attached to an entity. Tags are grouped by `CategoryId` — different endpoints expect tags from different categories. |
| **Customer Source** | The marketing attribution of a lead ("Google", "Referral", etc.). Identified by `CustomerSourceId`. |
| **Billing Terms** | How the customer pays (credit card, invoice, etc.). Identified by `BillingTermsId`. |
| **CreationSourceType** | Where a lead came from. The API sets this automatically (`Api` for simple lead post, `ApiWithDetails` when a quote/booking is supplied). |

---

## 2. Base URLs

Use a placeholder `{baseUrl}` in code. In deployed environments the real host is:

| Environment | URL pattern |
|---|---|
| **Production** | `https://{tenant}.maidcentral.com` — e.g. `https://acme.maidcentral.com`. Tenants also exist on `.maidcentral.net`, `mymbprofile.com`, `mymbprofile.net`, and `www.castlequick.net`. |
| **Local dev** | `https://castlekeepers.localhost:44300` |

There is no separate sandbox host — test against a staging/test tenant on one of the production domains.

All endpoints below are relative to `{baseUrl}/api/Lead/`.

---

## 3. Authentication

The API uses **OAuth 2.0 bearer tokens** issued by OWIN at `POST {baseUrl}/token`.

### 3.1 Obtain a token

```http
POST {baseUrl}/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=api-user@yourcompany.com&password=YourPassword
```

**Response (200):**

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 43199,
  "refresh_token": "9f3b1c...",
  "userName": "api-user@yourcompany.com",
  ".issued": "Mon, 20 Apr 2026 14:00:00 GMT",
  ".expires": "Tue, 21 Apr 2026 02:00:00 GMT"
}
```

- Access tokens expire after **12 hours**.
- Refresh tokens expire after **30 days** and are used via `grant_type=refresh_token`.
- 2FA users may need to pass `code` and `provider` form fields.

### 3.2 Use the token

Include `Authorization: Bearer {access_token}` on every `/api/Lead/*` request.

### 3.3 Required role

The user represented by the token must have the role **`Api`** (internal constant `AppConstants.Roles.Internal.Api`). In practice this is an "API User" account created through the admin UI and linked to exactly one `ServiceCompanyId`.

- All data operations are automatically scoped to that user's `ServiceCompanyId`.
- Attempting to access data from another branch returns empty results or 401.

### 3.4 Refreshing a token

```http
POST {baseUrl}/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refresh_token}
```

---

## 4. Multi-Tenancy

Every Lead API request is implicitly scoped to **one** `ServiceCompanyId` resolved from the bearer token's claims. You do **not** pass `ServiceCompanyId` in the request body — it is ignored if present.

As a consumer you should:

1. Provision a dedicated "API User" account per branch you want to access.
2. Obtain a token per branch and route requests accordingly.
3. Treat the token as identifying both the user and the branch.

Some endpoints additionally scope to `ServiceCompanyGroupId` (for example `/Tags` returns all tags in the tenant group, not just the branch).

---

## 5. Request & Response Conventions

### 5.1 Content types

- **Requests:** `Content-Type: application/json` for `POST` bodies. `GET` endpoints use query-string parameters.
- **Responses:** `Content-Type: application/json`.

### 5.2 Response envelope

All successful responses are wrapped in an `ApiResponse<T>` envelope (except `Utm`, which uses `ApiWrapperResult` — see below):

```json
{
  "isSuccess": true,
  "message": null,
  "result": { /* T */ },
  "innerException": null,
  "statusCode": 200,
  "metadata": null
}
```

| Field | Type | Meaning |
|---|---|---|
| `isSuccess` | `bool` | `true` on success. |
| `message` | `string?` | Human-readable error/info message. |
| `result` | `T` | The payload (shape depends on endpoint). |
| `innerException` | `string?` | Inner exception message on failure. |
| `statusCode` | `int` | HTTP status code echoed into the body. |
| `metadata` | `ApiMetadata?` | Optional pagination/date-range/filter metadata. Usually `null` on Lead endpoints. |

### 5.3 Alternate envelope: `ApiWrapperResult`

The `POST /Utm` endpoint wraps its result differently:

```json
{
  "result": true,
  "message": null,
  "innerException": null,
  "isSuccess": true,
  "totalCount": 0,
  "metadata": null
}
```

### 5.4 Unhandled exceptions

Any endpoint that throws an uncaught exception returns HTTP `500` with the exception message — these are **not** wrapped in `ApiResponse`. Treat them as error conditions.

### 5.5 Phone numbers

Phone fields are auto-formatted server-side via `BaseService.FormatPhone(...)` — you can submit any common format (`5555551234`, `(555) 555-1234`, `+1-555-555-1234`) and it will be normalized.

### 5.6 Dates & timestamps

- All dates are ISO-8601. Where a `DateTime` is expected, use `2026-05-01T09:00:00` (no timezone = server-local) or `2026-05-01T09:00:00Z` (UTC).
- `FirstJobDate` in `BookQuote` supports an optional time portion — `09:00` is the default if time is omitted.

---

## 6. Workflow A: Lead Form Post

Use this when you just want to capture a lead with contact info — no quote, no price, no booking. This is the "lead form" use case.

```
┌─────────────────────────────┐
│  POST /api/Lead/CreateOrUpdate  │  ◄── FirstName, LastName, Email, Phone, PostalCode, optional UTM
└─────────────────┬───────────┘
                  ▼
       Lead created in CRM
   (email sent, campaigns applied,
      webhooks/Keap triggered)
```

**Minimum request:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "555-555-1234",
  "postalCode": "90210"
}
```

**Optional recommended enhancements:**
- Pass `utm_source`, `utm_medium`, etc. to attribute the lead (stored asynchronously).
- Pass `customerSourceId` (obtained from `GET /CustomerSources`) for explicit source attribution.
- Pass `leadTagIds` (from `GET /Tags` filtered to `categoryId = 8`) to tag the lead.
- Set `allowDuplicates: false` (default) to de-duplicate against existing leads by phone/email.

**Result:** a `CustomerQuoteDto` with a `leadId` you can store.

---

## 7. Workflow B: Online Booking Form

Use this when you want the visitor to pick services, see prices, pick a date, and book — end-to-end.

```
STEP 1 — Bootstrap the form
────────────────────────────
GET /api/Lead/AboutCompany       → branding (logo, phone, address)
GET /api/Lead/PostalCodes        → validate visitor's ZIP is serviceable
GET /api/Lead/ScopeGroups        → top-level service categories
GET /api/Lead/Scopes?scopeGroupId=X
GET /api/Lead/ScopeFrequencies?scopeId=Y      (or read .Frequencies from ScopeGroups)
GET /api/Lead/Questions?scopeIds=Y,Z          → dynamic survey questions
GET /api/Lead/RateModifications?scopeGroupId=X → add-ons/discounts
GET /api/Lead/CustomerSources
GET /api/Lead/BillingTerms
GET /api/Lead/Tags                            → optional tagging

STEP 2 — Price preview (no lead yet)
────────────────────────────
POST /api/Lead/CalculatePrice    → returns a price per scope/frequency

STEP 3 — Create the lead
────────────────────────────
POST /api/Lead/CreateOrUpdate    → LeadId back

STEP 4 — Attach a quote with scopes + questions
────────────────────────────
POST /api/Lead/CreateOrUpdateQuote  → QuoteId back (Guid). This
                                     adds the service address to the lead,
                                     saves answers, and computes firm prices.

STEP 5 — Check date availability
────────────────────────────
GET /api/Lead/Availability?scopeGroupId=X&hours=3.5   (or &amount=250)
                                  → list of bookable DateTimes

STEP 6 — Collect payment card (optional)
────────────────────────────
Use CardConnect Tokenizer IFrame client-side to obtain {token, expiry}.

STEP 7 — Book
────────────────────────────
POST /api/Lead/BookQuote         → converts lead to customer,
                                   creates job(s), saves card,
                                   sends confirmation email.
```

Each step is independent — you can skip (e.g.) `AboutCompany` if you don't need branding, or skip `CalculatePrice` if you're OK showing the price only after creating the lead.

---

## 8. Endpoint Reference

Every endpoint requires `Authorization: Bearer {token}`. Every successful response is wrapped in `ApiResponse<T>` unless otherwise noted.

### Quick reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/Lead/CreateOrUpdate` | Create or update a lead |
| GET  | `/api/Lead/Lead?leadId=` | Get a single lead |
| POST | `/api/Lead/CreateOrUpdateQuote` | Attach/update a priced quote on a lead |
| GET  | `/api/Lead/Quote?quoteId=` | Get a quote |
| POST | `/api/Lead/CalculatePrice` | Price scopes without saving anything |
| POST | `/api/Lead/BookQuote` | Convert quote → customer + job(s) |
| POST | `/api/Lead/Utm` | Attach UTM attribution to a lead |
| GET  | `/api/Lead/AboutCompany` | Branding/marketing info |
| GET  | `/api/Lead/ScopeGroups` | List scope groups |
| GET  | `/api/Lead/Scopes?scopeGroupId=` | List scopes in a group |
| GET  | `/api/Lead/ScopeFrequencies?scopeId=` | List frequencies for a scope |
| GET  | `/api/Lead/CustomerSources` | List lead sources |
| GET  | `/api/Lead/BillingTerms` | List payment terms |
| GET  | `/api/Lead/Teams` | List scheduling teams |
| GET  | `/api/Lead/Tags` | List tags (all categories) |
| GET  | `/api/Lead/RateModifications?scopeGroupId=` | List add-ons/discounts |
| GET  | `/api/Lead/Questions?scopeIds=` | List dynamic questions for scope(s) |
| GET  | `/api/Lead/Availability?scopeGroupId=&hours=&amount=&startDate=&endDate=` | Bookable dates |
| GET  | `/api/Lead/PostalCodes` | Serviceable ZIPs |

---

### 8.1 `POST /api/Lead/CreateOrUpdate`

Create a new lead or update an existing one by matching phone/email.

**Request body:** [`LeadCreateOrUpdateDto`](#leadcreateorupdatedto)

**Response:** `ApiResponse<CustomerQuoteDto>` — see [`CustomerQuoteDto`](#customerquotedto)

**Behavior:**

- If `allowDuplicates = false` (default), the server looks for an existing lead with a matching phone or email (status < 9). If found, that lead is **updated** rather than creating a new one. `leadId` in the response will be the existing id.
- If `allowDuplicates = true`, always creates a new lead.
- If `leadId` is supplied and > 0, that specific lead is updated regardless of `allowDuplicates`.
- `postalCode` is checked against the branch's service zones. If outside the service area, the lead is still created but:
  - no campaign enrollment happens,
  - a "no service" email is sent instead of the regular lead email (only when `ServiceCompanyId == 0`, which is an edge case).
- Phone is auto-normalized.
- Email address validity is checked before the lead email is sent.
- `creationSourceType` is hard-coded to `Api` (1) by the server.

**Side effects (all async via Hangfire):**
- UTM values stored (if any `utm_*` field is set).
- Lead email sent to the customer if `sendLeadEmail = true` (default) and email is valid.
- Keap tags applied if `triggerWebhook = true` (default).
- Enrolled in `ExternalLeadCreated` email campaign if `addToCampaigns = true` (default) AND in service area.
- SignalR push to sales pipeline dashboard.

**Example request:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "555-555-1234",
  "postalCode": "90210",
  "customerSourceId": 12,
  "leadTagIds": [45, 67],
  "notes": "Interested in biweekly service",
  "allowDuplicates": false,
  "sendLeadEmail": true,
  "addToCampaigns": true,
  "triggerWebhook": true,
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "spring-2026"
}
```

**Example response:**

```json
{
  "isSuccess": true,
  "statusCode": 200,
  "result": {
    "leadId": 58231,
    "customerInformationId": null,
    "homeInformationId": null,
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "(555) 555-1234",
    "postalCode": "90210",
    "statusId": 1,
    "statusName": "New",
    "customerSourceId": 12,
    "customerSourceName": "Google Ads",
    "scopeGroupId": 0,
    "scopeGroupName": null,
    "homeAddress1": null,
    "homeCity": null,
    "homeRegion": null,
    "homePostalCode": null,
    "billingAddress1": null,
    "billingCity": null,
    "billingRegion": null,
    "billingPostalCode": null,
    "activateUrl": ""
  }
}
```

---

### 8.2 `GET /api/Lead/Lead?leadId={int}`

Fetch a single lead.

**Query parameters:**
- `leadId` (int, required) — the lead to retrieve.

**Response:** `ApiResponse<CustomerQuoteDto>`. Returns the same shape as `CreateOrUpdate`. Returns the lead regardless of status.

**Example:**

```http
GET /api/Lead/Lead?leadId=58231
Authorization: Bearer {token}
```

---

### 8.3 `POST /api/Lead/CreateOrUpdateQuote`

Attach (or update) a priced quote to an existing lead. Adds the service address, records answers to dynamic questions, and computes firm pricing. Optionally emails the quote to the customer.

**Request body:** [`CreateOrUpdateQuoteDto`](#createorupdatequotedto)

**Response:** `ApiResponse<CustomerQuoteDetailDto>` — see [`CustomerQuoteDetailDto`](#customerquotedetaildto)

**Behavior:**

- `leadId` is **required** and must match an existing lead.
- `scopeGroupId` is **required**.
- `scopesOfWork` must be non-empty. Each item is a [`DetailDto`](#detaildto) with `scopeOfWorkId` + `frequencyId`.
- `questions` is **required** — if any required question for the selected scopes is missing AND has no `ExternalDefaultValue`, the request throws with `"Missing required questions: …"`. Fetch the question list first via `/Questions`.
- Home address (`homeAddress1`, `homeCity`, `homeRegion`, `homePostalCode`) is **required** for the quote to save successfully.
- Billing address fields are optional — if omitted, billing defaults to the service address.
- Throws if the lead already has `statusId >= 9` (already booked).
- If `quoteId` is supplied (Guid), that existing quote is updated. Otherwise a new one is created and its id is returned.
- `baseFee` on a scope override lets you force a specific per-frequency base price; the server back-calculates the allowed hours from the configured hourly rate.
- `rateModifications` let you apply add-ons/discounts per scope.

**Side effects (all async):**
- Quote email sent after ~5 min if `sendQuoteEmail = true`.
- Keap "QuoteSent" tag applied if `triggerWebhook = true` AND `sendQuoteEmail = true`.
- Enrolled in `ExternalQuoteCreated` campaign if `addToCampaigns = true` AND `sendQuoteEmail = true`.
- UTM stored if any `utm_*` provided.

**Example request:**

```json
{
  "leadId": 58231,
  "scopeGroupId": 3,
  "homeAddress1": "123 Main St",
  "homeAddress2": "Apt 4",
  "homeCity": "Beverly Hills",
  "homeRegion": "CA",
  "homePostalCode": "90210",
  "billingAddress1": "123 Main St",
  "billingCity": "Beverly Hills",
  "billingRegion": "CA",
  "billingPostalCode": "90210",
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
    { "questionId": 102, "answer": "2" },
    { "questionId": 103, "answer": "5,6,7" }
  ],
  "sendQuoteEmail": true,
  "addToCampaigns": true,
  "triggerWebhook": true
}
```

**Example response:**

```json
{
  "isSuccess": true,
  "statusCode": 200,
  "result": {
    "leadId": 58231,
    "quoteId": "3c8b8a12-4e5b-4f1e-95c6-3d0c5b2a7ff0",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "(555) 555-1234",
    "statusId": 5,
    "statusName": "Quoted",
    "scopeGroupId": 3,
    "scopeGroupName": "Residential Cleaning",
    "homeAddress1": "123 Main St",
    "homeCity": "Beverly Hills",
    "homeRegion": "CA",
    "homePostalCode": "90210",
    "scopes": [
      {
        "scopeId": 15,
        "scopeName": "Standard Clean",
        "frequencies": [
          {
            "frequencyId": "E2",
            "frequencyName": "Every 2 Weeks",
            "adjustedBaseCost": 165.00,
            "calculatedBaseCost": 164.75,
            "minimumCost": 150.00,
            "totalBaseHours": 3.50,
            "totalRecurringCost": 190.00,
            "totalFirstJobCost": 215.00,
            "totalRecurringHours": 3.50,
            "totalFirstJobHours": 4.00,
            "rateModifications": [
              {
                "rateModificationId": 44,
                "name": "Inside Fridge",
                "quantity": 1,
                "isRecurring": true,
                "calculatedCost": 25.00,
                "calculatedHours": 0.50
              }
            ],
            "priceCalculation": "Base: 3.5h × $47 = $164.75 → rounded $165",
            "isBooked": false,
            "isInterested": true
          }
        ]
      }
    ],
    "questions": [
      {
        "questionId": 101,
        "questionText": "How many bedrooms?",
        "questionType": "WholeNumber",
        "answer": "3",
        "answerIds": ""
      }
    ]
  }
}
```

---

### 8.4 `GET /api/Lead/Quote?quoteId={Guid}`

Fetch an existing quote with full pricing breakdown.

**Query parameters:**
- `quoteId` (`Guid`, required).

**Response:** `ApiResponse<CustomerQuoteDetailDto>` (same shape as `CreateOrUpdateQuote`).

Note: `priceCalculation` fields will be `null` when fetched standalone — they are only populated during a live `CreateOrUpdateQuote`/`CalculatePrice` call.

---

### 8.5 `POST /api/Lead/CalculatePrice`

Compute pricing for a set of scopes **without creating any records**. Ideal for in-page price previews.

**Request body:** [`CalculatePricingInputDto`](#calculatepricinginputdto)

**Response:** `ApiResponse<List<GetPricingOutputDto>>`

**Behavior:**

- Requires `scopesOfWork` (each with `scopeOfWorkId` and `frequencyId`) and `questions` (answers to all required questions for the selected scopes — otherwise throws).
- `scopeGroupId` is accepted but the server doesn't strictly require it for price calculation.
- `postalCode` is accepted but unused by the pricing engine (included for symmetry).
- Only returns frequencies the caller asked about — the response filters `frequencies` to match what was posted.
- No lead/quote is created. No side effects.

**Example request:**

```json
{
  "postalCode": "90210",
  "scopeGroupId": 3,
  "scopesOfWork": [
    {
      "scopeOfWorkId": 15,
      "frequencyId": "E2",
      "rateModifications": []
    },
    {
      "scopeOfWorkId": 15,
      "frequencyId": "E4"
    }
  ],
  "questions": [
    { "questionId": 101, "answer": "3" },
    { "questionId": 102, "answer": "2" }
  ]
}
```

**Example response:**

```json
{
  "isSuccess": true,
  "statusCode": 200,
  "result": [
    {
      "scopeOfWorkId": 15,
      "frequencies": [
        {
          "frequencyId": "E2",
          "frequencyName": "Every 2 Weeks",
          "adjustedBaseCost": 165.00,
          "calculatedBaseCost": 164.75,
          "minimumCost": 150.00,
          "totalBaseHours": 3.50,
          "priceCalculation": "Base: 3.5h × $47/hr",
          "rateModifications": []
        },
        {
          "frequencyId": "E4",
          "frequencyName": "Every 4 Weeks",
          "adjustedBaseCost": 195.00,
          "calculatedBaseCost": 194.30,
          "minimumCost": 180.00,
          "totalBaseHours": 4.15,
          "priceCalculation": "Base: 4.15h × $47/hr",
          "rateModifications": []
        }
      ]
    }
  ]
}
```

---

### 8.6 `POST /api/Lead/BookQuote`

Convert a quote into a booked customer + scheduled job(s). This is the final, commitment step.

**Request body:** [`BookQuoteDto`](#bookquotedto)

**Response:** `ApiResponse<CustomerQuoteDetailDto>`

**Behavior:**

- `quoteId` is **required** (must be non-empty Guid).
- The lead's `statusId` must be `< 9` — re-booking a booked quote throws.
- Each item in `scopesOfWork` **must** have a `firstJobDate` (not `DateTime.MinValue`). The time component, if provided, sets the start time; otherwise defaults to `09:00 AM`.
- Each `scopesOfWork` item must match a scope+frequency already saved on the quote (via `CreateOrUpdateQuote`). Unknown combinations throw `"Cannot find Quote/Frequency option"`.
- `teamIds = []` (empty/missing) means "Not Scheduled Team" (team 0). Supply team ids from `GET /Teams`.
- Payment card (optional): if both `token` and `expiry` are provided, a CardConnect customer profile is created and linked. The token/expiry must come from a client-side CardConnect Tokenizer IFrame.
- Tags are applied per-level:
  - `customerTagIds` — [Tags](#tagcategoryid) with `categoryId = 3`
  - `homeServiceTagIds` — `categoryId = 4`
  - `serviceSetTagIds` (on each scope) — `categoryId = 5`
  - `firstJobTagIds` (on each scope) — `categoryId = 6`
- After booking, the lead is converted to a `Customer` (`customerInformationId` populated) and one or more jobs are created.

**Side effects (all async):**
- Home lat/lng geocoded via Google Maps.
- Booking confirmation email sent (~5 min delay) if `sendBookedEmail = true`.
- Customer portal invite email sent if `sendCustomerPortalInvite = true` AND the `CustomerPortal` feature is enabled on the branch.
- Keap "QuoteBooked" tag applied if `triggerWebhook = true`.
- UTM stored if any `utm_*` provided.
- `creationSourceType` on the UTM record becomes `ApiWithDetails` (2).

**Example request:**

```json
{
  "leadId": 58231,
  "quoteId": "3c8b8a12-4e5b-4f1e-95c6-3d0c5b2a7ff0",
  "scopeGroupId": 3,
  "scopesOfWork": [
    {
      "scopeOfWorkId": 15,
      "frequencyId": "E2",
      "firstJobDate": "2026-05-04T09:00:00",
      "firstJobInstructions": "Gate code 1234. Dog will be in crate.",
      "firstJobTagIds": [201],
      "serviceSetTagIds": [302],
      "teamIds": [7]
    }
  ],
  "billingTermsId": 1,
  "token": "9401000000008137",
  "expiry": "1229",
  "customerTagIds": [51],
  "homeServiceTagIds": [60],
  "sendBookedEmail": true,
  "sendCustomerPortalInvite": true,
  "triggerWebhook": true,
  "addToCampaigns": true
}
```

**Example response:** Same shape as [`CustomerQuoteDetailDto`](#customerquotedetaildto). After booking, `customerInformationId` will be populated and the `isBooked` flag on the matching scope/frequency will be `true`.

---

### 8.7 `POST /api/Lead/Utm`

Asynchronously attach UTM attribution to an existing lead (or find one by contact info).

**Request body:** [`QuoteUtmDto`](#quoteutmdto)

**Response:** `ApiWrapperResult` (note: different envelope from other endpoints)

- One of `leadId`, `email`, or `phone` must be supplied. If `leadId` is null the server searches by phone/email.
- If no lead is found, returns `{ isSuccess: false, message: "No Quote Found" }`.
- If found, enqueues an async job to persist the UTM record and returns `{ result: true, isSuccess: true }`.

**Example:**

```json
{
  "email": "jane@example.com",
  "utm_source": "facebook",
  "utm_medium": "paid_social",
  "utm_campaign": "spring-2026",
  "utm_content": "ad-variant-b"
}
```

---

### 8.8 `GET /api/Lead/AboutCompany`

Return branding/marketing information for the branch the token is scoped to. Useful to populate logos, phone numbers, and social links on the booking form.

**Response:** `ApiResponse<ServiceCompanyMarketingContextDto>` — see [`ServiceCompanyMarketingContextDto`](#servicecompanymarketingcontextdto).

**Example response excerpt:**

```json
{
  "isSuccess": true,
  "result": {
    "serviceCompanyId": 42,
    "name": "Acme Cleaners - Beverly Hills",
    "publicLogoImageUrl": "https://cdn.../acme-logo.png",
    "publicPhoneNumber": "(555) 555-0100",
    "publicEmail": "hello@acme.example",
    "facebookProfileUrl": "https://facebook.com/acme",
    "yelpUrl": "https://yelp.com/biz/acme",
    "googleBusinessUrl": "https://g.page/acme",
    "address1": "500 Sunset Blvd",
    "city": "Beverly Hills",
    "region": "CA",
    "postalCode": "90210",
    "businessHoursStart": "08:00:00",
    "businessHoursEnd": "17:00:00",
    "timeZoneInfoId": "Pacific Standard Time"
  }
}
```

---

### 8.9 `GET /api/Lead/ScopeGroups`

List all scope groups configured for the branch. Scope groups contain nested scopes and frequencies, so one call can bootstrap your whole service picker.

**Response:** `ApiResponse<List<ScopeGroupDto>>` — see [`ScopeGroupDto`](#scopegroupdto).

```json
{
  "result": [
    {
      "scopeGroupId": 3,
      "name": "Residential Cleaning",
      "marketingText": "Keep your home spotless.",
      "scopes": [
        {
          "scopeId": 15,
          "name": "Standard Clean",
          "isRequired": false,
          "frequencies": [
            { "frequencyId": "E1", "name": "Weekly" },
            { "frequencyId": "E2", "name": "Every 2 Weeks" },
            { "frequencyId": "E4", "name": "Every 4 Weeks" },
            { "frequencyId": "S",  "name": "One-Time" }
          ]
        }
      ]
    }
  ]
}
```

---

### 8.10 `GET /api/Lead/Scopes?scopeGroupId={int}`

List scopes for one group (subset of the data in `/ScopeGroups`).

**Query parameters:** `scopeGroupId` (int, required).
**Response:** `ApiResponse<List<ScopeDto>>`.

---

### 8.11 `GET /api/Lead/ScopeFrequencies?scopeId={int}`

List frequencies available for one scope.

**Query parameters:** `scopeId` (int, required).
**Response:** `ApiResponse<List<FrequencyDto>>`.

---

### 8.12 `GET /api/Lead/CustomerSources`

List lead source options (for attribution dropdown).

**Response:** `ApiResponse<List<CustomerSourceDto>>`.

```json
{ "result": [ { "customerSourceId": 12, "name": "Google Ads" } ] }
```

---

### 8.13 `GET /api/Lead/BillingTerms`

List payment/billing term options. The default is credit card (`billingTermsId = 1`).

**Response:** `ApiResponse<List<BillingTermsDto>>`.

---

### 8.14 `GET /api/Lead/Teams`

List scheduling teams for the branch.

**Response:** `ApiResponse<List<TeamApiDto>>`.

```json
{
  "result": [
    { "teamId": 7, "name": "Team Blue", "color": "#2b6cb0", "sortOrder": 1 }
  ]
}
```

---

### 8.15 `GET /api/Lead/Tags`

List **all** tags for the tenant (scoped to `ServiceCompanyGroupId`). Filter client-side by `categoryId` for the context you need.

**Response:** `ApiResponse<List<TagDto>>`.

**TagCategoryId cheat sheet** (per XML docs on the DTOs that consume them):

| CategoryId | Used for | API field |
|---|---|---|
| 3 | Customer tags | `BookQuoteDto.customerTagIds` |
| 4 | Home / Service-at-Home tags | `BookQuoteDto.homeServiceTagIds` |
| 5 | Service Set tags | `BookDetailDto.serviceSetTagIds` |
| 6 | First-Job tags | `BookDetailDto.firstJobTagIds` |
| 8 | Lead tags | `LeadCreateOrUpdateDto.leadTagIds` |

> ⚠️ CastleQuick also has internal reporting uses of tag categories with different CategoryId conventions; for the **Lead API**, trust the mapping above.

---

### 8.16 `GET /api/Lead/RateModifications?scopeGroupId={int}`

List add-ons, extras, and discounts available for scopes in a group.

**Query parameters:** `scopeGroupId` (int, required).
**Response:** `ApiResponse<List<RateModLeadOutputDto>>`.

Each entry has a `scopeId` indicating which scope it applies to. `costCalcType` is either `Flat` (0) or `Percentage` (1).

```json
{
  "result": [
    {
      "rateModificationId": 44,
      "name": "Inside Fridge",
      "description": "Deep clean inside the refrigerator",
      "rateModificationType": "Cleaning Extras",
      "scopeId": 15,
      "cost": 25.0,
      "costDisplay": "$25.00",
      "costCalcType": "Flat",
      "costCalcDescription": "Flat Amount",
      "isPercentage": false,
      "isRequired": false
    }
  ]
}
```

---

### 8.17 `GET /api/Lead/Questions?scopeIds={int}&scopeIds={int}...`

List dynamic survey questions for one or more scopes. Note the repeated query-string parameter style (ASP.NET Web API `[FromUri] List<int>`).

**Query parameters:**
- `scopeIds` (List<int>, required) — repeat for each scope, e.g. `?scopeIds=15&scopeIds=16`.

**Response:** `ApiResponse<List<QuestionLeadOutputDto>>`.

Returns questions of all step types (`BeforePricing`, `DuringPricing`, `AfterPricing`).

```json
{
  "result": [
    {
      "questionId": 101,
      "scopeId": 15,
      "questionText": "How many bedrooms?",
      "questionType": "WholeNumber",
      "isRequired": true,
      "helpText": null,
      "textValue": "3",
      "answers": [],
      "questionStepType": "Before Pricing",
      "sortOrder": 1,
      "pricingAdjustmentDescription": "Adds 0.25 hours per bedroom"
    },
    {
      "questionId": 103,
      "scopeId": 15,
      "questionText": "Any pets in the home?",
      "questionType": "Multiple Select List",
      "isRequired": false,
      "answers": [
        { "answerId": 5, "answerText": "Dog" },
        { "answerId": 6, "answerText": "Cat" },
        { "answerId": 7, "answerText": "Other" }
      ],
      "questionStepType": "Before Pricing",
      "sortOrder": 3
    }
  ]
}
```

**Answer encoding** (when posting back in `ApiQuoteQuestionDto.answer`):
- `Text`, `RichText`, `WholeNumber`, `Decimal`, `Date`, `Time`, `DateTime` → literal string.
- `SelectList` → the `answerId` as a string (e.g. `"5"`).
- `Multiple Select List` → comma-separated answer ids (e.g. `"5,6,7"`).

---

### 8.18 `GET /api/Lead/Availability?scopeGroupId={int}&hours={double?}&amount={double?}&startDate={DateTime?}&endDate={DateTime?}`

Returns dates where a booking of the given size **can still fit** into the branch's schedule, based on either hour-capacity or revenue-target availability (per the scope group's configuration).

**Query parameters:**
- `scopeGroupId` (int, required).
- `hours` (double, conditional) — total allowed hours of the job. Required when the scope group's `availabilityType = Hours`.
- `amount` (double, conditional) — job dollar amount. Required when `availabilityType = Revenue`.
- `startDate` (DateTime, optional) — defaults to today (UTC). The server further shifts this forward by the group's configured cutoff days/time.
- `endDate` (DateTime, optional) — defaults to +1 month.

**Response:** `ApiResponse<List<DateTime>>`.

```json
{
  "result": [
    "2026-05-04T00:00:00",
    "2026-05-05T00:00:00",
    "2026-05-07T00:00:00"
  ]
}
```

**Gotchas:**
- The current day is never bookable (server always sets `firstDayOfQuery = today + 1` minimum).
- If the group has `externalBookingCutOffDays` or `externalBookingCutOffTimeOfDay` configured, the earliest bookable day is pushed out further.
- You **must** supply `hours` OR `amount` (matching the group's `availabilityType`) — otherwise the endpoint either throws `"Hours is required"` or returns unfiltered results.

---

### 8.19 `GET /api/Lead/PostalCodes`

List postal codes the branch services, grouped by home zone. Use this to validate a visitor's ZIP before starting a booking flow.

**Response:** `ApiResponse<List<PostalCodeZoneDto>>`.

```json
{
  "result": [
    { "postalCode": "90210", "zoneId": 4, "zoneName": "West Side" },
    { "postalCode": "90211", "zoneId": 4, "zoneName": "West Side" },
    { "postalCode": "90401", "zoneId": 5, "zoneName": "Santa Monica" }
  ]
}
```

---

## 9. Data Schemas

All types live in `CastleKeeper.Service.Api.LeadDtos.cs` unless otherwise noted.

### Request DTOs

#### `LeadCreateOrUpdateDto`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `leadId` | `int?` | No | — | Supply to target an existing lead explicitly. |
| `firstName` | `string` | **Yes** | — | |
| `lastName` | `string` | **Yes** | — | |
| `email` | `string` | **Yes** | — | Must be valid email. |
| `phone` | `string` | **Yes** | — | Any format — server normalizes. |
| `postalCode` | `string` | **Yes** | — | Used for service-area check. |
| `sendLeadEmail` | `bool` | No | `true` | Send the lead-received email to the customer. |
| `addToCampaigns` | `bool` | No | `true` | Enroll in the MaidCentral drip campaign (only when in service area). |
| `triggerWebhook` | `bool` | No | `true` | Trigger Keap/Zapier webhooks. |
| `allowDuplicates` | `bool` | No | `false` | If `false`, matching phone/email → update existing lead. |
| `redirectUrl` | `string?` | No | — | Echoed back; optional for your own form logic. |
| `notes` | `string?` | No | — | Single note attached to the lead. |
| `customerSourceId` | `int` | No | `0` | From `GET /CustomerSources`. `0` = unset. |
| `leadTagIds` | `int[]` | No | `[]` | From `GET /Tags` where `categoryId == 8`. |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `string?` | No | — | Stored asynchronously. |

#### `CreateOrUpdateQuoteDto`

| Field | Type | Required | Description |
|---|---|---|---|
| `leadId` | `int` | **Yes** | Must be > 0. |
| `quoteId` | `Guid?` | No | Supply to update an existing quote; omit for a new one. |
| `scopeGroupId` | `int` | **Yes** | Must be > 0. |
| `homeAddress1` | `string` | **Yes** | |
| `homeAddress2` | `string?` | No | |
| `homeCity` | `string` | **Yes** | |
| `homeRegion` | `string` | **Yes** | 2-char state/province code. |
| `homePostalCode` | `string` | **Yes** | Max length 7. |
| `billingAddress1`, `billingAddress2`, `billingCity` | `string?` | No | Defaults to service address if omitted. |
| `billingRegion` | `string?` | No | Max length 2. |
| `billingPostalCode` | `string?` | No | Max length 7. |
| `scopesOfWork` | [`DetailDto[]`](#detaildto) | **Yes** | Must be non-empty. |
| `questions` | [`ApiQuoteQuestionDto[]`](#apiquotequestiondto) | **Yes** | Must satisfy all required questions (or they'll be filled with `ExternalDefaultValue` if available). |
| `sendQuoteEmail` | `bool` | No (default `false`) | Email the quote to the customer (after ~5 min). |
| `addToCampaigns` | `bool` | No (default `true`) | Only pushes to `ExternalQuoteCreated` campaign when `sendQuoteEmail` is also `true`. |
| `triggerWebhook` | `bool` | No (default `true`) | Fires Keap "QuoteSent" when `sendQuoteEmail = true`. |
| `utm_*` | `string?` | No | |

#### `BookQuoteDto`

| Field | Type | Required | Description |
|---|---|---|---|
| `leadId` | `int` | **Yes** | |
| `quoteId` | `Guid` | **Yes** | Non-empty. |
| `scopeGroupId` | `int` | **Yes** | |
| `scopesOfWork` | [`BookDetailDto[]`](#bookdetaildto) | **Yes** | Every item must have `firstJobDate`. |
| `billingTermsId` | `int?` | No | From `/BillingTerms`. Default = credit card. |
| `token` | `string?` | No | CardConnect tokenizer token. Pair with `expiry`. |
| `expiry` | `string?` | No | MMYY or YYMM (matches tokenizer output). |
| `customerTagIds` | `int[]` | No | Tags with `categoryId = 3`. |
| `homeServiceTagIds` | `int[]` | No | Tags with `categoryId = 4`. |
| `sendBookedEmail` | `bool` | No (default `false`) | Booking confirmation email to the customer. |
| `sendCustomerPortalInvite` | `bool` | No (default `false`) | Requires the branch to have the `CustomerPortal` feature. |
| `addToCampaigns` | `bool` | No (default `true`) | |
| `triggerWebhook` | `bool` | No (default `true`) | Fires Keap "QuoteBooked". |
| `utm_*` | `string?` | No | |

#### `DetailDto`

Used in `CreateOrUpdateQuoteDto.scopesOfWork` and `CalculatePricingInputDto.scopesOfWork`.

| Field | Type | Required | Description |
|---|---|---|---|
| `scopeOfWorkId` | `int` | **Yes** | |
| `frequencyId` | `string` | **Yes** | See [FrequencyId](#frequencyid). |
| `baseFee` | `double?` | No | Override the computed base price for this scope+frequency. |
| `rateModifications` | [`RateModDto[]`](#ratemoddto) | No | |

#### `BookDetailDto`

Extends `DetailDto` with scheduling fields.

| Field | Type | Required | Description |
|---|---|---|---|
| (inherits all DetailDto fields) | | | |
| `firstJobDate` | `DateTime` | **Yes** | Non-default. Time component optional — default time is 09:00. |
| `firstJobInstructions` | `string?` | No | |
| `firstJobTagIds` | `int[]` | No | Tags with `categoryId = 6`. |
| `serviceSetTagIds` | `int[]` | No | Tags with `categoryId = 5`. |
| `teamIds` | `int[]` | No | Empty/omitted = "Not Scheduled" (team 0). |

#### `RateModDto`

| Field | Type | Required | Description |
|---|---|---|---|
| `rateModificationId` | `int` | **Yes** | |
| `quantity` | `int` | **Yes** | Must not be 0. |
| `isRecurring` | `bool` | No (default `false`) | `false` = first-job only; `true` = every job. |
| `rateModificationFrequencyId` | `int` | read-only | Server computes as `2` if `isRecurring` else `1`. |

#### `CalculatePricingInputDto`

| Field | Type | Required | Description |
|---|---|---|---|
| `postalCode` | `string?` | No | Accepted but unused by the pricing engine. |
| `scopeGroupId` | `int` | **Yes** | |
| `scopesOfWork` | `DetailDto[]` | **Yes** | |
| `questions` | `ApiQuoteQuestionDto[]` | **Yes** | All required questions for selected scopes. |

#### `ApiQuoteQuestionDto`

| Field | Type | Required | Description |
|---|---|---|---|
| `questionId` | `int` | **Yes** | From `/Questions`. |
| `answer` | `string` | **Yes** | See [encoding rules](#817-get-apileadquestionsscopeidsintscopeidsint) for multi-select. |

#### `QuoteUtmDto`

| Field | Type | Required | Description |
|---|---|---|---|
| `leadId` | `int?` | Conditional | One of `leadId`, `email`, or `phone` required. |
| `email` | `string?` | Conditional | |
| `phone` | `string?` | Conditional | |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `string?` | No | |

---

### Response DTOs

#### `ApiResponse<T>`

```ts
{
  isSuccess: boolean;
  message: string | null;
  result: T;
  innerException: string | null;
  statusCode: number;
  metadata: ApiMetadata | null;
}
```

#### `ApiWrapperResult`

Used by `/Utm`.

```ts
{
  result: any;
  message: string | null;
  innerException: string | null;
  isSuccess: boolean;   // default true
  totalCount: number;
  metadata: ApiMetadata | null;
}
```

#### `CustomerQuoteDto`

Returned by `CreateOrUpdate` and `GET /Lead`.

| Field | Type | Description |
|---|---|---|
| `leadId` | `int` | Stable identifier for the lead. |
| `customerInformationId` | `int?` | Populated only after booking. |
| `homeInformationId` | `int?` | Populated only after the home address is attached. |
| `firstName`, `lastName`, `email`, `phone`, `postalCode` | `string` | |
| `statusId` | `int` | See [QuoteStatusId](#quotestatusid). |
| `statusName` | `string` | Human-readable label. |
| `customerSourceId`, `customerSourceName` | `int?`, `string` | |
| `billingTermsId`, `billingTermsName` | `int?`, `string` | |
| `scopeGroupId`, `scopeGroupName` | `int`, `string` | `0`/`null` until a quote is attached. |
| `homeAddress1`, `homeAddress2`, `homeCity`, `homeRegion`, `homePostalCode` | `string?` | |
| `billingAddress1`, `billingAddress2`, `billingCity`, `billingRegion`, `billingPostalCode` | `string?` | |
| `activateUrl` | `string` | Customer-portal activation URL (empty until booked). |

#### `CustomerQuoteDetailDto`

Returned by `CreateOrUpdateQuote`, `GET /Quote`, `BookQuote`. Extends `CustomerQuoteDto` with:

| Field | Type | Description |
|---|---|---|
| `quoteId` | `Guid` | |
| `bookNowUrl` | `string` | Public URL to the external quote page (book-now view). |
| `scopes` | `CustomerQuoteDetailScopeDto[]` | Every scope on the quote with per-frequency pricing. |
| `questions` | `ApiQuoteQuestionOutputDto[]` | Answered survey questions. |

#### `CustomerQuoteDetailScopeDto`

```ts
{
  scopeId: number;
  scopeName: string;
  frequencies: CustomerQuoteDetailScopeFrequencyDto[];
}
```

#### `CustomerQuoteDetailScopeFrequencyDto`

Extends [`GetPricingFrequencyDto`](#getpricingfrequencydto) with:

| Field | Type | Description |
|---|---|---|
| `isBooked` | `bool` | `true` once the frequency has been booked via `BookQuote`. |
| `isInterested` | `bool` | `true` if it's selected on the quote (even if not booked). |

#### `GetPricingFrequencyDto`

| Field | Type | Description |
|---|---|---|
| `frequencyId` | `string` | See [FrequencyId](#frequencyid). |
| `frequencyName` | `string` | Display name. |
| `minimumCost` | `decimal` | Floor — `adjustedBaseCost` never drops below this. |
| `calculatedBaseCost` | `decimal` | Raw computed price before rounding rules. |
| `adjustedBaseCost` | `decimal` | Final base price after rounding rules. |
| `totalBaseHours` | `decimal` | Allowed labor time in hours. |
| `totalRecurringCost` / `totalRecurringHours` | `decimal` | Base + recurring rate-mods. |
| `totalFirstJobCost` / `totalFirstJobHours` | `decimal` | Base + recurring + one-time rate-mods. |
| `rateModifications` | `CustomerQuoteDetailRateModificationOutputDto[]` | |
| `priceCalculation` | `string` | Free-text explanation (populated during live pricing calls). |

#### `GetPricingOutputDto`

Returned by `CalculatePrice`.

```ts
{
  scopeOfWorkId: number;
  frequencies: GetPricingFrequencyDto[];
}
```

#### `CustomerQuoteDetailRateModificationOutputDto`

```ts
{
  rateModificationId: number;
  name: string;
  quantity: number;
  isRecurring: boolean;
  calculatedCost: decimal;
  calculatedHours: decimal;
}
```

#### `ScopeGroupDto`

```ts
{
  scopeGroupId: number;
  name: string;
  marketingText: string | null;
  scopes: ScopeDto[];
}
```

#### `ScopeDto`

```ts
{
  scopeId: number;
  name: string;
  isRequired: boolean;        // must be included if booking this scope group
  frequencies: FrequencyDto[];
}
```

#### `FrequencyDto`

```ts
{ frequencyId: string; name: string; }
```

#### `CustomerSourceDto`

```ts
{ customerSourceId: number; name: string; }
```

#### `BillingTermsDto`

```ts
{ billingTermsId: number; name: string; }
```

#### `TeamApiDto`

```ts
{ teamId: number; name: string; color: string; sortOrder: number; }
```

#### `TagDto`

```ts
{
  tagId: number;
  name: string;
  category: string;
  categoryId: number;      // see TagCategoryId cheat sheet
  description: string | null;
  color: string | null;
  icon: string | null;
}
```

#### `RateModLeadOutputDto`

```ts
{
  rateModificationId: number;
  name: string;
  description: string | null;
  rateModificationType: string;    // "Cleaning Extras" | "Discounts" | "Other"
  isPercentage: boolean;
  isRequired: boolean;
  scopeId: number;
  cost: number;                    // double
  costDisplay: string;
  costCalcType: "Flat" | "Percentage";
  costCalcDescription: string;
}
```

#### `QuestionLeadOutputDto`

```ts
{
  scopeId: number;
  questionId: number;
  isRequired: boolean;
  questionText: string;
  answers: AnswerLeadOutputDto[];        // only populated for SelectList types
  helpText: string | null;
  icon: string | null;
  color: string | null;
  questionStepType: "Before Pricing" | "During Pricing" | "After Pricing";
  questionType: "Text" | "Select List" | "Multiple Select List" | "Rich Text"
              | "Whole Number" | "Decimal" | "Date" | "Time" | "Date and Time";
  textValue: string | null;              // default answer if any
  pricingAdjustmentDescription: string | null;
  sortOrder: number;
}
```

#### `AnswerLeadOutputDto`

```ts
{
  answerId: number;
  answerText: string;
  icon: string | null;
  color: string | null;
  helpText: string | null;
  sortOrder: number;
}
```

#### `ApiQuoteQuestionOutputDto`

Returned inside `CustomerQuoteDetailDto.questions`.

```ts
{
  questionId: number;
  questionText: string;
  questionType: string;
  answer: string;         // rendered answer text
  answerIds: string;      // raw ids (comma-separated for multi-select)
}
```

#### `PostalCodeZoneDto`

```ts
{ postalCode: string; zoneName: string; zoneId: number; }
```

#### `ServiceCompanyMarketingContextDto`

```ts
{
  serviceCompanyId: number;
  name: string;
  publicLogoImageUrl: string | null;
  publicWebsiteUrl: string | null;
  publicPhoneNumber: string | null;
  publicPhoneNumberSales: string | null;
  publicEmail: string | null;
  publicEmailSales: string | null;
  publicMastheadImageUrl: string | null;
  facebookProfileUrl: string | null;
  yelpUrl: string | null;
  googleBusinessUrl: string | null;
  angiesListUrl: string | null;
  instagramUrl: string | null;
  quotingToolUrl: string | null;
  footerAbout: string | null;
  baseUrl: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  physicalAddress1: string | null;
  physicalAddress2: string | null;
  physicalCity: string | null;
  physicalRegion: string | null;
  physicalPostalCode: string | null;
  timeZoneInfoId: string | null;       // e.g. "Pacific Standard Time"
  businessHoursStart: string;           // "HH:mm:ss" TimeSpan
  businessHoursEnd: string;
}
```

---

## 10. Enumerations & Magic Values

### FrequencyId

`FrequencyId` is a short API-facing abbreviation of a service frequency. Map to/from display names via `/ScopeFrequencies` or `/ScopeGroups`.

| FrequencyId | Typical display name | Internal ServiceTypeId |
|---|---|---|
| `E1` | Weekly | `W` |
| `E2` | Every 2 Weeks (biweekly) | `B` |
| `E3` | Every 3 Weeks | `T` |
| `E4` | Every 4 Weeks (monthly) | `M` |
| `S`  | One-Time | `O` |
| `OR` | Recurring One-Time | `S` |
| `OD` | One-Time Deep Clean | `D` |

Use the **`FrequencyId`** (E1/E2/…) in all API requests. The internal `ServiceTypeId` is never exposed over the wire.

### QuoteStatusId

Numeric stage on `tblCustomerQuote.QuoteStatusId`. Names are configurable per branch but the semantics are stable:

| StatusId (typical) | Meaning |
|---|---|
| `1` | New / Lead |
| `2` | Contacted |
| `5` | Quoted |
| `6` | Quote Sent |
| **`9`** | **Booked** — `>= 9` blocks `CreateOrUpdateQuote` and `BookQuote` |
| `11` | Closed / Lost (or similar terminal state) |

The only hard rule enforced by the API: **`statusId >= 9` means no further quoting or booking allowed on this lead**. Always create a new lead instead.

### ContactTypeId

Internal values the server uses to bucket contact info (you don't pass these directly — they're set server-side):

| ContactTypeId | Meaning |
|---|---|
| `2` | Phone |
| `3` | Email |

### TagCategoryId

See the [tags cheat sheet](#815-get-apileadtags).

### CreationSourceType (server-set)

You never set this — the server picks the right one based on which endpoint you hit:

| Value | Name | Set by |
|---|---|---|
| 1 | `Api` | `CreateOrUpdate`, `Utm` |
| 2 | `ApiWithDetails` | `CreateOrUpdateQuote`, `BookQuote` |

### QuotingType

Fixed to `External` (`2`) for all Lead API traffic.

### QuestionType

Returned as the `questionType` string in `QuestionLeadOutputDto`:

`Text | Select List | Multiple Select List | Rich Text | Whole Number | Decimal | Date | Time | Date and Time`

### QuestionStepType

Returned as the `questionStepType` string:

`Before Pricing | During Pricing | After Pricing`

### AvailabilityType (on `tblServiceSetTypeGroup`)

| Value | Name | Effect on `/Availability` |
|---|---|---|
| 0 | `Revenue` | Requires `amount` query parameter |
| 1 | `Hours` | Requires `hours` query parameter |

---

## 11. Side Effects

These fire asynchronously via Hangfire background jobs. Callers get a successful response *before* the side effect completes; expect a few seconds to a few minutes of latency.

| Endpoint | When | What happens |
|---|---|---|
| `CreateOrUpdate` | always (if valid email & `sendLeadEmail`) | Lead email to customer |
| `CreateOrUpdate` | if `triggerWebhook` | Keap "LeadCreated" trigger |
| `CreateOrUpdate` | if `addToCampaigns` & in service area | Enroll in `ExternalLeadCreated` campaign |
| `CreateOrUpdate` | any utm_* provided | Persist UTM record |
| `CreateOrUpdate` | always | SignalR push to dashboard + sales pipeline |
| `CreateOrUpdateQuote` | if `sendQuoteEmail` | Quote email (~5 min delay) |
| `CreateOrUpdateQuote` | if `sendQuoteEmail` & `triggerWebhook` | Keap "QuoteSent" trigger |
| `CreateOrUpdateQuote` | if `sendQuoteEmail` & `addToCampaigns` | Enroll in `ExternalQuoteCreated` campaign; schedule campaign-fitness check at +15 sec |
| `CreateOrUpdateQuote` | any utm_* provided | Persist UTM record |
| `BookQuote` | always | Geocode address via Google Maps; save lat/lng |
| `BookQuote` | if `sendBookedEmail` | Booking confirmation email |
| `BookQuote` | if `triggerWebhook` | Keap "QuoteBooked" trigger |
| `BookQuote` | if `sendCustomerPortalInvite` & CustomerPortal feature enabled | Send customer portal activation email |
| `BookQuote` | any utm_* provided | Persist UTM record |
| `Utm` | lead found | Persist UTM record |

---

## 12. Errors

The Lead API doesn't have a uniform error body. Two patterns exist:

1. **Thrown exceptions** — surface as HTTP 500 with the exception message in the default MVC error response. Examples:
   - `"LeadId is required"` (CreateOrUpdateQuote, if `leadId == 0`)
   - `"ScopeGroupId is required"` (CreateOrUpdateQuote, CalculatePrice, Availability)
   - `"ScopesOfWork is required"` (CreateOrUpdateQuote, CalculatePrice)
   - `"Cannot create quote for this lead. Status is booked. Create a new lead."` (CreateOrUpdateQuote, BookQuote when `statusId >= 9`)
   - `"All address fields (Address1, City, Region, PostalCode) are required."` (CreateOrUpdateQuote)
   - `"FirstJobDate is required for all Scopes because you have supplied for one."` (BookQuote)
   - `"QuoteId is required."` (BookQuote when `quoteId == Guid.Empty`)
   - `"Cannot find Quote/Frequency option"` (BookQuote when a scope/frequency isn't on the quote)
   - `"Missing required questions: …"` (CreateOrUpdateQuote, CalculatePrice)
   - `"Hours is required"` / `"Amount must be greater than 0"` / `"EndDate must be greater than StartDate"` (Availability)

2. **Soft failures** (`ApiWrapperResult` shape) — used by `/Utm`:
   ```json
   { "isSuccess": false, "message": "No Quote Found" }
   ```

Recommended client pattern:

```
1. Send request.
2. If HTTP != 200 → treat as error; surface the response text.
3. If HTTP == 200 and body.isSuccess == false → treat as soft error; use body.message.
4. Otherwise → use body.result.
```

---

## Appendix: Authoring Notes

- **Concurrency:** Creating two leads at the exact same time with the same phone/email and `allowDuplicates = false` can race to both create new leads. For critical flows, re-fetch after create and deduplicate client-side.
- **Idempotency:** None of the `POST` endpoints are idempotent. If you need idempotency, store the `leadId`/`quoteId` on your side and re-use it on retry (pass `leadId` into `CreateOrUpdate`, `quoteId` into `CreateOrUpdateQuote`).
- **Rate limits:** None at the application layer as of this writing. Be courteous.
- **Versioning:** There is no version prefix in the URL. Breaking changes are announced via release notes.
