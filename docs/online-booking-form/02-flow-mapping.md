# 02 — Flow Mapping: EstimateController → Lead API

This document maps each **action** in `EstimateController` to its **Lead API** equivalent. For full request/response shapes of each Lead API endpoint, see [`../lead-api.md`](../lead-api.md).

For each EstimateController action, you'll see:
- **Maps to** — the Lead API endpoint(s) the rebuild should call.
- **Preserved** — behavior the API gives you for free.
- **Different shape** — where data shapes change.
- **Done automatically by API** — work the existing form does explicitly that the API now handles.
- **Lost in translation** — behavior you can't replicate; pointer to `03-gap-analysis.md`.

---

## Quick map

| EstimateController action | Lead API endpoint(s) | Notes |
|---|---|---|
| `GetServiceCompanyId` (internal helper) | — | **GAP §1.** No public endpoint. |
| `Index` (resume by `?c=`) | — | **OUT OF SCOPE.** No equivalent endpoint. |
| `Index` (load marketing text) | `GET /AboutCompany` (partial) | **GAP §3.** Only company-wide branding, not per-scope-group. |
| `GetMarketingText` | — | **GAP §3.** |
| `Step1` (load) | `GET /ScopeGroups` + `GET /Scopes?scopeGroupId=` + `GET /Questions?scopeIds=` | Returns identical lists; client renders the form. |
| `Step1GroupScopeQuestions` (rerender) | `GET /Scopes?scopeGroupId=` + `GET /Questions?scopeIds=` | Re-fetch same endpoints. |
| `GetServiceSetTypesByGroup` | `GET /Scopes?scopeGroupId=` | One-to-one. |
| `GetServiceSetTypeQuestions` | `GET /Questions?scopeIds=` | One-to-one. |
| `CheckServicePostalCode` | `GET /PostalCodes` (client-side filter) | **GAP §1** for multi-branch routing. |
| `CreateOrUpdateCustomerQuote` | `POST /CreateOrUpdate` | Lead created. SMS-consent fields lost (**GAP §5**). |
| `Pricing` (live recalc in Step 2) | `POST /CalculatePrice` | Same calc, no auto-save of "left panel" HTML. |
| `Step2` (load) | `GET /ScopeFrequencies?scopeId=` + `GET /RateModifications?scopeGroupId=` + `GET /Questions?scopeIds=` | Combine client-side. |
| `CreateOrUpdateCustomerQuoteDetails` | `POST /CreateOrUpdateQuote` | Saves quote + answers + addresses + sends quote email. |
| `ApplyDiscountCode` | — | **GAP §2.** No endpoint. |
| `DeselectLine` | — | **GAP §6.** No endpoint. |
| `RemoveServiceSetTypeFromQuote` | — | **GAP §6.** Workaround: re-call `POST /CreateOrUpdateQuote` with the desired final scope list. |
| `Step3` (load) | `GET /Quote?quoteId=` + `GET /Questions?scopeIds=` + `GET /BillingTerms` + `GET /Tags` + `GET /Availability?scopeGroupId=&hours=` | Combine client-side. |
| `GetServiceTypeGroupAvailability` | `GET /Availability?scopeGroupId=&hours=&amount=&startDate=&endDate=` | Direct equivalent — server calc identical. |
| `GetSummary` | `GET /Quote?quoteId=` | Read the quote and re-render summary client-side. |
| `CreateOrUpdateCustomerFromQuote` | `POST /BookQuote` | Books the quote. CardConnect token+expiry passed inline. |
| `Step4` | — | **OUT OF SCOPE.** |
| `Homes` / `ChooseHome` | — | **OUT OF SCOPE.** |
| `Testimonials` (page) | — | **GAP §4.** Partner supplies their own. |
| `Terms` (page) | — | **GAP §4.** Partner supplies their own. |
| Online tracking (`SendOnlineStatusUpdate`, `Session["OnlineQuoteId"]`) | — | **DROP.** Internal only. |

---

## Bootstrap (form load → ready to render Step 1)

### Existing
`GET /External/Estimate/Index` returns an HTML shell. Then `GET /External/Estimate/Step1` returns `_Step1Partial.cshtml` already populated with scope groups, scopes, and questions.

### Rebuild
The Partner SPA does the analogous bootstrap with multiple parallel API calls:

```http
GET /api/Lead/AboutCompany           # branding
GET /api/Lead/PostalCodes            # for client-side ZIP validation
GET /api/Lead/ScopeGroups            # plus nested scopes + frequencies
GET /api/Lead/CustomerSources        # optional
GET /api/Lead/Tags                   # optional, for tag pickers
```

Cache these for the session — they don't change while the visitor is on the form.

**Done automatically by API:** `ScopeGroups` includes `Scopes` and `MarketingText` per group inline. You don't need a separate marketing-text endpoint — but note the gap: there's no per-scope-group HTML body, only a short `MarketingText` field.

**Lost:** the existing form's Razor partial-rendering. Partner does all rendering in React.

---

## Step 1 — Contact + scope picker

### Existing actions

`GET /External/Estimate/Step1` (load) → `POST /External/Estimate/CreateOrUpdateCustomerQuote` (submit)

### Rebuild

Render the form from the cached bootstrap data. On submit:

```http
POST /api/Lead/CreateOrUpdate
Content-Type: application/json
Authorization: Bearer {token}

{
  "firstName": "...",
  "lastName": "...",
  "email": "...",
  "phone": "...",
  "postalCode": "...",
  "customerSourceId": ...,
  "leadTagIds": [...],
  "utm_source": "...", "utm_medium": "...", "utm_campaign": "...",
  "sendLeadEmail": true,
  "addToCampaigns": true,
  "triggerWebhook": true
}
```

**Preserved:**
- ZIP service-area check happens server-side (the lead is still created if outside; the response will indicate by omission of campaign enrollment — the API doesn't return an `outsideServiceArea` flag, so call `GET /PostalCodes` first if you want to surface that to the visitor).
- Phone normalization.
- De-duplication against existing leads with same phone/email (`allowDuplicates: false` by default).
- Lead email + Keap tag + campaign enrollment fired async.

**Different shape:**
- The existing form passes a `ContactInfos` array (`{ contactTypeId, contactInfo }` pairs) to support N contact methods. The Lead API takes a single `email` + `phone` field. Multiple contact rows per lead are not exposed via the API.
- `customerSourceId` is on the API; `LeadTagIds` is on the API. Both work.

**Done automatically by API:**
- SignalR `leadCreated` push.
- ZIP-vs-zone lookup against `tblZoneZip`.
- UTM persist (if any `utm_*` fields are present).
- `creationSourceType` is hard-coded to `Api`.

**Lost in translation:**
- **SMS consent fields** — `smsConsentTransactional` / `smsConsentMarketing` have **no API field**. See gap §5. Workaround: store these on the Partner side and surface separately, or block submission until both are checked.
- **Multi-branch routing** — the API uses the token's `ServiceCompanyId`. If the visitor's ZIP belongs to a different branch, the lead lands in the wrong branch. See gap §1. Workaround: Partner backend looks up the right branch from the visitor's ZIP and re-issues the API call with that branch's token.
- **Franchise ZIP allow-list** — no API check. Lead is created regardless. See gap §1 (covered by multi-branch routing fix).
- **Existing-customer check** (`showAccountLogin = true`) — out of scope.

---

## Step 2 — Frequency + price preview

### Existing actions

`POST /External/Estimate/Step2` (load) → `POST /External/Estimate/Pricing` (live recalc) → `POST /External/Estimate/CreateOrUpdateCustomerQuoteDetails` (save)

### Rebuild

#### Step 2 load — already cached

The Partner already has `ScopeGroups`, `Scopes`, and `Frequencies` from bootstrap. For per-scope rate modifications and the during-pricing questions:

```http
GET /api/Lead/RateModifications?scopeGroupId={id}
GET /api/Lead/Questions?scopeIds={id1},{id2},...
```

#### Live recalc

Each time the visitor changes a frequency / answers a question / toggles a rate-mod:

```http
POST /api/Lead/CalculatePrice

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
    { "questionId": 101, "answer": "3" }
  ]
}
```

Response gives per-scope, per-frequency: `calculatedBaseCost`, `adjustedBaseCost`, `minimumCost`, `totalRecurringCost`, `totalFirstJobCost`, plus a list of applied `rateModifications` with their `calculatedCost`.

The Partner reads this and renders the summary themselves. The existing form's "render `_Summary` partial server-side" trick is gone — Partner code owns presentation.

**Preserved:**
- Identical pricing math (server-side `CalculatePrice` is the same code path internally).
- Rate-mod addition / discount math.
- Per-frequency calc (one-time vs recurring).

**Different shape:**
- Existing form returns a JSON `data` array AND a Razor `viewLeftPanel` HTML fragment AND a `lowestLine` summary object. The API returns just the per-scope pricing list. Partner computes `lowestLine` and the summary HTML.

**Done automatically by API:**
- `Quoting_RoundPrices` feature is honored server-side; `adjustedBaseCost` will already be rounded if the tenant has it enabled.
- Rooms-based pricing — the existing form fetches rooms server-side via `PopulateRoomsBasedOnFactors` then re-runs the calc. The API does this internally too. Partner doesn't need to pass room counts.

**Lost in translation:**
- Discount codes — see gap §2.

#### Save quote (Step 2 submit)

```http
POST /api/Lead/CreateOrUpdateQuote

{
  "leadId": 58231,
  "quoteId": null,                  // null on first save; pass returned Guid on resave
  "scopeGroupId": 3,
  "homeAddress1": "123 Main St",
  "homeCity": "Beverly Hills",
  "homeRegion": "CA",
  "homePostalCode": "90210",
  "billingAddress1": "...",         // optional, defaults to service address
  "billingCity": "...",
  "billingRegion": "...",
  "billingPostalCode": "...",
  "scopesOfWork": [ ... ],
  "questions": [ ... ],
  "sendQuoteEmail": true,
  "addToCampaigns": true,
  "triggerWebhook": true
}
```

**Preserved:**
- Quote estimate email (5-min delay).
- Campaign enrollment + Keap "QuoteSent" tag.
- Status auto-progression (`statusId` becomes `5` "Quoted").
- SignalR `leadUpdated` push.
- `VerifyQuoteShouldStillBeInCampaign` 15-second guard.

**Different shape:**
- `quoteId` is the public name; the existing form calls it `gid` (a Guid). Same value.
- The API requires home address fields (`homeAddress1`, `homeCity`, `homeRegion`, `homePostalCode`) — the existing form had them as optional but the underlying service required them too.

**Lost:** none of consequence at this step.

---

## Step 3 — Address + payment + schedule + book

### Existing actions

`POST /External/Estimate/Step3` (load) → `POST /External/Estimate/GetServiceTypeGroupAvailability` (calendar) → `POST /External/Estimate/CreateOrUpdateCustomerFromQuote` (book)

### Rebuild

#### Step 3 load — multi-call

The existing form does a heroic single-action load. The Partner does it as parallel API calls:

```http
GET /api/Lead/Quote?quoteId={guid}
GET /api/Lead/Questions?scopeIds=...      # for AfterPricing — filter client-side
GET /api/Lead/BillingTerms                # if exposing billing-terms picker
GET /api/Lead/Tags                        # for CategoryId 5 (service-set) and 6 (first-job)
GET /api/Lead/Teams                       # if exposing team picker
GET /api/Lead/Availability?scopeGroupId=&hours=&amount=&startDate=&endDate=
```

**Note:** `GET /Questions` returns questions for ALL step types (`BeforePricing`, `DuringPricing`, `AfterPricing`). Filter client-side using `questionStepType` on each returned question.

#### Calendar

Direct mapping:

```http
GET /api/Lead/Availability
  ?scopeGroupId={id}
  &hours={total recurring hours from CalculatePrice}    # use one of these
  &amount={total recurring cost from CalculatePrice}    # the group's AvailabilityType decides
  &startDate=2026-04-21
  &endDate=2026-05-21
```

Returns a JSON list of `DateTime` values (ISO 8601). The capacity/lead-time/cutoff calc is identical to the existing form — same code, exposed as an API.

**Preserved:** the entire availability algorithm (cutoff days, cutoff time-of-day, per-day-of-week revenue/hours goals, override availability, trainee position factor, average team efficiency).

#### Payment tokenization (CardConnect)

The existing form embeds the CardConnect Tokenizer iframe (URL fetched from `_cardConnectService.GetCardConnectTokenizerUrl()`). The Partner has to do the same client-side dance:

1. Embed the CardConnect Tokenizer iframe (URL pattern documented in `04-react-build-spec.md`).
2. The iframe posts back `{ token, expiry }` via `window.postMessage`.
3. The Partner stashes those values for the booking call.

> The Lead API does **not** expose the per-tenant tokenizer URL. See gap §7. Workaround for now: the Partner-side configuration includes the CardConnect tokenizer URL as a build-time constant per branch.

#### Book

```http
POST /api/Lead/BookQuote

{
  "leadId": 58231,
  "quoteId": "3c8b8a12-...",
  "scopeGroupId": 3,
  "scopesOfWork": [
    {
      "scopeOfWorkId": 15,
      "frequencyId": "E2",
      "firstJobDate": "2026-05-01T09:00:00",
      "firstJobInstructions": "Gate code 1234",
      "firstJobTagIds": [11, 13],
      "serviceSetTagIds": [],
      "teamIds": []
    }
  ],
  "billingTermsId": 2,                   // 2 = credit card; default
  "token": "{from CardConnect iframe}",
  "expiry": "{from CardConnect iframe}",
  "customerTagIds": [],                  // CategoryId 3
  "homeServiceTagIds": [],               // CategoryId 4
  "sendBookedEmail": true,
  "sendCustomerPortalInvite": true,      // ignored if portal feature off
  "addToCampaigns": true,
  "triggerWebhook": true,
  "utm_source": "...", "utm_medium": "..."
}
```

**Preserved:**
- Customer creation + home creation + job creation in one transaction.
- Frequency-precedence ordering (`O, W, B, T, M`) is internal to the booking service; Partner doesn't have to sort.
- Default first-job tags `[11, 13]` are NOT applied automatically by the API — Partner must include them explicitly if desired.
- Booking confirmation email + portal invite (if enabled) + Keap tag.
- SignalR `leadBooked` push.
- Geocode + lat/lng save (Hangfire).
- `VerifyQuoteShouldStillBeInCampaign` 15-second guard.

**Different shape:**
- The existing form passes `Schedules` as a parallel array; the API folds the schedule into each `BookDetailDto.firstJobDate`.
- The existing form computes staggered start dates for multi-frequency bookings (`schedule.StartDate = FirstStartDate + GetDaysBetweenByServiceTypeId(frequency)`). The API expects the Partner to pass each frequency's actual `firstJobDate`. **The Partner must compute the stagger themselves** if they support multi-frequency bookings.
- `RedirectUrl` — the existing form returns a redirect URL string; the API returns a `CustomerQuoteDetailDto` with `customerInformationId`. Partner derives their own "thank you" URL.

**Lost in translation:**
- Discount code application (gap §2).
- Franchise ZIP re-check (gap §1).
- The `IpAddress` field — the API doesn't capture it. (If you need it for fraud/audit, it's not available.)

---

## Side-effect inventory: what fires when

Cross-reference for the Partner builder. Everything in this table happens automatically when the Partner calls the corresponding API — **no extra calls needed**.

| Lead API call | Hangfire jobs | SignalR | Status change |
|---|---|---|---|
| `POST /CreateOrUpdate` | UTM persist, lead email (immediate, not 10-min like the existing form), `ExternalLeadCreated` campaign, Keap `LeadCreated` | `leadCreated` | Status 1 (New) |
| `POST /CreateOrUpdateQuote` | UTM persist, quote estimate email (5-min delay if `sendQuoteEmail`), `ExternalQuoteCreated` campaign, `VerifyQuoteShouldStillBeInCampaign` 15s, Keap `QuoteSent` | None directly — but the dashboard polls | Status 5 (Quoted) |
| `POST /CalculatePrice` | None | None | None |
| `POST /BookQuote` | UTM persist, booked email (5s delay), portal invite (if applicable), `VerifyQuoteShouldStillBeInCampaign`, geocode, Keap `QuoteBooked` | None directly | Status 9+ (Booked) |
| `POST /Utm` | UTM persist | None | None |

> **Behavior difference:** the existing `EstimateController.CreateOrUpdateCustomerQuote` schedules the lead email with a 10-minute delay (gives sales a chance to call first). The API's `POST /CreateOrUpdate` sends it immediately. If you need the 10-min delay, file a feature request.

---

## Cross-reference

- For each gap mentioned above, see [`03-gap-analysis.md`](./03-gap-analysis.md).
- For the React-side architecture and call-sequencing details, see [`04-react-build-spec.md`](./04-react-build-spec.md).
- For request/response shapes, see [`../lead-api.md`](../lead-api.md).
