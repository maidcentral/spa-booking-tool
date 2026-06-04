# 01 — How the Existing Online Booking Form Works

This document is a **complete walk-through** of the booking form currently served by `CastleKeeper.Web/Areas/External/Controllers/EstimateController.cs` (1,501 lines) and its Razor partials at `CastleKeeper.Web/Areas/External/Views/Estimate/`.

It is written for a reader who has never seen the form. The goal is to leave you with a precise mental model of:

- What the visitor sees, in what order
- What each button click does on the server
- What feature flags / company settings change behavior
- What async side effects fire after the visitor moves on
- Where state lives (session, hidden inputs, encrypted URL params, server cache)

If you are the engineer rebuilding this form against the Lead API, read this first; then use [`02-flow-mapping.md`](./02-flow-mapping.md) to translate each action into an API call, and [`03-gap-analysis.md`](./03-gap-analysis.md) to learn what the API can't yet do.

---

## Table of Contents

1. [Architecture overview](#1-architecture-overview)
2. [URL parameters and quote resumption](#2-url-parameters-and-quote-resumption)
3. [Service company resolution (multi-branch)](#3-service-company-resolution-multi-branch)
4. [Step 0 — Landing (`Index`)](#4-step-0--landing-index)
5. [Step 1 — Contact + scope picker](#5-step-1--contact--scope-picker)
6. [Step 2 — Frequency + price preview](#6-step-2--frequency--price-preview)
7. [Step 3 — Address, payment, schedule](#7-step-3--address-payment-schedule)
8. [Step 4 — Optional account creation](#8-step-4--optional-account-creation)
9. [Async side effects](#9-async-side-effects)
10. [Feature flags that change behavior](#10-feature-flags-that-change-behavior)
11. [State storage summary](#11-state-storage-summary)
12. [Internal-only behavior the rebuild can drop](#12-internal-only-behavior-the-rebuild-can-drop)

---

## 1. Architecture overview

The current form is a **server-rendered, AJAX-progressively-enhanced multi-step wizard**:

- The `Index` action returns a single `Index.cshtml` page containing four empty `<section>` placeholders (one per step).
- Each step's content is loaded into its placeholder via AJAX as the visitor advances. The endpoints (`Step1`, `Step2`, `Step3`, `Step4`) each return a Razor `PartialViewResult`, not JSON.
- Form posts also return JSON or HTML fragments depending on the action — the front-end JS at `view-resources/Areas/External/Estimate/*.js` decides what to do with them.
- A SignalR hub (`HubService`) pushes "lead online / created / updated / booked" events to internal staff dashboards. The visitor never sees this traffic.
- All endpoints are `[AllowAnonymous]` — there is no auth on the visitor's side.

```
                  ┌─────────────────────────────────────┐
   Visitor ──►    │  GET /external/estimate/index       │ ─► Index.cshtml (shell + 4 sections)
                  └─────────────────────────────────────┘
                                   │
   Step1.js loads ────────────────►│ GET  /external/estimate/Step1            ─► _Step1Partial.cshtml
   Step1 submit ───────────────────►│ POST /external/estimate/CreateOrUpdateCustomerQuote ─► JSON
                                   │
   Step2.js loads ────────────────►│ POST /external/estimate/Step2            ─► _Step2Partial.cshtml
   Step2 price calc ──────────────►│ POST /external/estimate/Pricing          ─► JSON + Razor fragment
   Step2 submit ───────────────────►│ POST /external/estimate/CreateOrUpdateCustomerQuoteDetails ─► JSON
                                   │
   Step3.js loads ────────────────►│ POST /external/estimate/Step3            ─► _Step3Partial.cshtml
   Step3 calendar ────────────────►│ POST /external/estimate/GetServiceTypeGroupAvailability ─► JSON
   Step3 submit ───────────────────►│ POST /external/estimate/CreateOrUpdateCustomerFromQuote ─► JSON (redirect URL)
                                   │
   Step4 (optional) ───────────────►│ GET  /external/estimate/Step4           ─► _Step4Partial.cshtml
```

Three other ambient channels run alongside:

- **Hangfire** background jobs: lead emails, quote emails, booked emails, Keap tag sync, campaign enrollment, geocoding, customer-portal invite.
- **SignalR `UpdateSalesPipelineSignalR`** events: `leadOnline`, `leadCreated`, `leadUpdated`, `leadBooked`. Internal-only.
- **Database touches** via `CustomerQuoteService.RecordQuoteActivity(...)` to update `DateLastModified` so internal "online now" indicators light up.

---

## 2. URL parameters and quote resumption

The `Index` action accepts these query-string parameters via `ExternalPricingIndexInput`:

| Param | Meaning |
|---|---|
| `c` | Encrypted `CustomerQuoteId` (AES, base64-URL-encoded). Used to **resume** a partially-completed quote from an emailed link. |
| `cid` | Encrypted `CustomerInformationId`. Used when the visitor is being routed in from an existing-customer touchpoint. |
| `gid` | The `CustomerQuoteDetailGroupId` (Guid) of an existing quote draft. Lets the form pick up where it left off. |
| `sstgId` | A specific `ServiceSetTypeGroupId` (scope group) to lock the form to. Used when the marketing site links into a specific service ("Carpet Cleaning"). |
| `sstIds` | Comma-separated `ServiceSetTypeId` list to pre-select. |
| `Phone`, `Email` | If passed, the form first checks for an existing in-flight quote with matching contact info. |

**Resume-by-link flow (`?c=...`):**

1. `Index` decrypts `c` to get a `CustomerQuoteId`.
2. Looks up the quote, checks `QuoteStatusId`.
3. Fires SignalR `leadOnline` event so the internal pipeline shows "this lead is on the form right now".
4. If `QuoteStatusId == 1` ("Needs Contacted"), auto-progresses to `2` ("Contacted") to reflect that the lead has self-served.
5. Stores `Session["OnlineQuoteId"]` and `Session["OnlineSessionStart"]` for downstream tracking.

> **Decision recorded:** The Partner rebuild is **dropping** `?c=` resume support (see `README.md` "Scope decisions"). The Lead API has no equivalent encrypted-token resume endpoint.

---

## 3. Service company resolution (multi-branch)

This is one of the most subtle parts of the existing form. CastleQuick supports a "Service Company Group" that contains multiple branches (`ServiceCompany`s). A single marketing site at `acme.maidcentral.com` can serve every branch in `acme`'s group.

### `GetServiceCompanyId(postalCode)` algorithm

Defined in `EstimateController.GetServiceCompanyId(string postalCode)`:

1. Start with `ServiceCompanyId = base.ServiceCompanyId` (resolved from session or subdomain).
2. Read `ServiceCompanyGroupId` from the subdomain (e.g. `acme.maidcentral.com` → `acme`).
3. If a `postalCode` is supplied and is valid:
   - Trim it to the company's configured `MaxPostalCodeLength` (US: 5, UK: 7, etc.).
   - Look up the `tblZoneZip` row for that ZIP, scoped to the group.
   - If found: set `ServiceCompanyId` to that zone's branch and call `base.SetUserCredentials(...)` to remember the choice in session.
   - If not found: set `OutsideServiceArea = true`.
4. If a group ID is known but no branch was resolved, fall back to the first branch in the group.

The result (`CheckServicePostalCodeOutput`) contains `ServiceCompanyId`, `ServiceCompany`, and `OutsideServiceArea`.

### Endpoint that uses it

`POST /External/Estimate/CheckServicePostalCode` returns `{ validZip, serviceCompanyDidChange, scid }` — the JS uses this to swap branches mid-flow if the visitor changes their ZIP.

### Why this matters for the rebuild

The Lead API operates with one fixed `ServiceCompanyId` per token. There is **no public endpoint** equivalent to "given a ZIP, return the right branch". This is a **Critical** gap for any Partner with more than one branch — see `03-gap-analysis.md` §1.

---

## 4. Step 0 — Landing (`Index`)

**Action:** `GET /External/Estimate/Index?c=&cid=&gid=&sstgId=&sstIds=&Phone=&Email=`

**View:** `Index.cshtml`

### What renders

A two-column layout:

- Left column (`col-md-9`): the wizard shell with four hidden `<section>` tags, one per step. They start `display:none` and are populated by AJAX.
- Right column (`col-md-3`): a sticky "Summary" panel and a marketing-text card. Summary updates as scopes are added.
- Above both: a thin progress bar.
- Hidden inputs at the top: `c`, `cid`, `gid` — passed through every subsequent AJAX call.

### What happens server-side

1. Decrypt and process `c` (resume support — see §2).
2. If `CustomerQuoteId` is still 0, look up an existing quote by phone/email via `CheckExistingQuote`.
3. Fetch `MarketingText` for the scope group via `IServiceSetTypeGroupService.GetMarketingText(...)`.
4. Pass everything into the Razor view as `ExternalPricingIndexInput`.

### What the JS does on page load

`Index.js` triggers Step 1 to load: `GET /External/Estimate/Step1`.

---

## 5. Step 1 — Contact + scope picker

**Action:** `GET /External/Estimate/Step1` returns `_Step1Partial.cshtml`

**Form post:** `POST /External/Estimate/CreateOrUpdateCustomerQuote` returns JSON `{ customerQuoteId, showAccountLogin, customerInformationId, validZip }`

### What the visitor sees

A single form with these fields (see `_Step1Partial.cshtml`):

| Field | Notes |
|---|---|
| First Name | Required |
| Last Name | Required |
| Contact Info(s) | Dynamic list rendered from `Model.ContactInfos`. Each entry has a `ContactTypeId` (2 = phone, 3 = email) and an input. The default config shows phone + email. |
| Postal Code | Length and label come from `CacheHelper.Current.ServiceCompanyZipPostalCodeLabel()` and `...ServiceCompanyMaxPostalCodeLength()`. The label can be "ZIP", "Postal Code", "Postcode" depending on country. |
| Scope Group + Scope picker | Rendered by the `_GroupScopeQuestionForm` partial inside a `#group-scope-questions` div. If only one scope group exists, the picker is hidden. |
| Before-pricing questions | Dynamic — rendered inside the same partial. Loaded from `IServiceSetTypeQuestionService.GetServiceSetTypeQuestions(...)` filtered to `QuestionStepType.BeforePricing`. |
| SMS consent — transactional | Checkbox. Required by default. Can be made optional via the `Sms_OptionalConsentCheckboxes` feature flag. |
| SMS consent — marketing | Checkbox. Same toggle. |
| Terms of Service link | URL from `CacheHelper.Current.TermsOfServiceUrl()` or default. |
| Privacy Policy link | URL from `CacheHelper.Current.PrivacyPolicyUrl()` or default. |
| Next button | Submits the form. |

### Server flow when the visitor clicks "Next"

1. **Validation gate:** if `Sms_OptionalConsentCheckboxes` is **disabled** AND either consent checkbox is unchecked → `{ success: false, message: "Both SMS consent checkboxes are required." }`.
2. Resolve `ServiceCompanyId` from the supplied `PostalCode` via `GetServiceCompanyId(...)`.
3. **Franchise ZIP gate** (only if `Feature.Franchise` is enabled): if the trimmed ZIP isn't approved for this branch via `IServiceCompanyZipService.IsZipCodeApproved(...)`, throw `UserFriendlyException("This zip code is not approved for your franchise area.")`.
4. Re-fetch existing quote address via `GetPricingStep1Model(...)` and merge — never blank an address that was already saved.
5. If still no `CustomerQuoteId`, look up by `ContactInfos` list across the group via `CheckExistingQuote(...)`.
6. Fetch all questions for the selected scopes (any step type — used for upsert).
7. Call `_customerQuoteService.CreateOrUpdateCustomerQuote(input)` → returns `customerQuoteId`.
8. If UTM params present, enqueue `ICustomerQuoteUtmService.CreateOrEdit(...)` via Hangfire.
9. Fire SignalR `leadCreated` event with full lead snapshot (name, email, phone, address, status 1 "Needs Contacted").
10. If a valid email is present and the lead is brand-new, schedule:
    - `ITemplateService.SendLeadEmail(...)` (10 min delay) or `SendLeadNoServiceEmail(...)` if outside service area.
    - `ICampaignEmailAutomationService.ExternalLeadCreated(...)` if in service area.
    - `IKeapService.ApplyKeapTags(..., KeapTrigger.LeadCreated)`.
11. If the customer portal is enabled and a customer with this contact info already exists, return `showAccountLogin = true` plus an encrypted `CustomerInformationId`.
12. AES-encrypt the `customerQuoteId` and return it as `cqId` in the JSON response.

### Step 1's three companion endpoints

- `Step1GroupScopeQuestions` — re-renders the `_GroupScopeQuestionForm` partial when the visitor changes the scope group dropdown. Fired by JS on dropdown change.
- `GetServiceSetTypesByGroup(serviceSetTypeGroupId, postalCode)` — JSON; renders the `_ScopePicker` partial after the visitor changes the scope group.
- `GetServiceSetTypeQuestions(SeviceSetTypeQuestionsInput)` — JSON; re-renders the `_QuestionList` partial after the visitor selects/deselects scopes.

### Online-tracking side effect

Every Step 1 load calls `SendOnlineStatusUpdate(customerQuoteId, serviceCompanyId, "Step1")`:

- Records activity in DB (touches `DateLastModified`).
- If `QuoteStatusId == 1` ("Needs Contacted"), auto-progresses to `2` ("Contacted").
- Pushes SignalR `leadOnline` event with `IsOnline = true`.

---

## 6. Step 2 — Frequency + price preview

**Loader:** `POST /External/Estimate/Step2` returns `_Step2Partial.cshtml` (262 lines)

**Price calc:** `POST /External/Estimate/Pricing` returns JSON `{ data, viewLeftPanel, lowestLine }`

**Save:** `POST /External/Estimate/CreateOrUpdateCustomerQuoteDetails` returns JSON `{ gid, c }`

### What the visitor sees

For each scope they selected in Step 1, a card showing:

- Scope name
- A radio/button group for each available frequency (`O` one-time, `W` weekly, `B` biweekly, `T` every 3 weeks, `M` monthly, etc.)
- For the currently-selected frequency: the calculated price, with a tool-tip breakdown (`PriceCalculation`)
- Optional rate-modification (add-on / discount) checkboxes per scope
- Address fields (auto-populated from Step 1 ZIP if available)
- During-pricing questions (e.g. "How many bedrooms?")

The right-panel summary updates live every time the visitor toggles a frequency or rate mod.

### Server flow on Step 2 load

1. Check `IsBookedOrExpired(gid)` → if booked/expired, return `_BookedOrExpired` partial instead.
2. Resolve `ServiceCompanyId`.
3. SignalR online tracking (no auto-progress yet).
4. Call `_serviceSetTypeService.GetServiceSetTypesForPricing(input)` → returns scope/frequency lines and **rooms** (kitchens, bedrooms, bathrooms inferred from the home).
5. Auto-select frequency if a scope has only one frequency option.
6. Fetch `DuringPricing` questions for the selected scopes.
7. Map to `ExternalPricingStep2Model` and merge in address fields from Step 1.

### Server flow on `Pricing` (live recalc)

This fires on every visitor action in Step 2 (frequency change, rate-mod toggle, question change):

1. Fetch fresh rates via `GetServiceSetTypesForPricing(...)`.
2. **Internal hack:** the front-end doesn't know about rooms — the server re-fetches them, calls `PopulateRoomsBasedOnFactors(input)` to back-fill them, then runs `CalculatePrice(input)` to get final per-line costs.
3. Compute the "lowest line" (the cheapest selected frequency) for the marketing summary.
4. Render the `_Summary` partial as HTML and return both the JSON `data` and the rendered `viewLeftPanel`.

### Server flow on Step 2 submit (save quote)

`CreateOrUpdateCustomerQuoteDetails`:

1. Re-save the address (in case the visitor changed it on Step 2).
2. Fetch all `DuringPricing` and `AfterPricing` questions for the selected scopes.
3. Re-run pricing the same way (rates → rooms → calc).
4. Persist the quote details via `CreateOrUpdateCustomerQuoteDetail(input)` → returns the `CustomerQuoteDetailGroupId` (the quote `Guid`).
5. Track activity and **auto-progress to `QuoteStatusId = 5` ("Quoted")**.
6. Send the quote estimate email (`SendQuoteEstimateEmailMany`) immediately.
7. Enqueue `ICampaignEmailAutomationService.ExternalQuoteCreated(...)`.
8. Schedule `VerifyQuoteShouldStillBeInCampaign(...)` 15 seconds later (de-dupe guard).
9. Apply Keap "QuoteSent" tag.
10. Fire SignalR `leadUpdated` event.
11. Return `{ gid, c }` to the front-end.

---

## 7. Step 3 — Address, payment, schedule

**Loader:** `POST /External/Estimate/Step3` returns `_Step3Partial.cshtml` (146 lines)

**Calendar:** `POST /External/Estimate/GetServiceTypeGroupAvailability` returns JSON `[ "yyyy-MM-dd", ... ]`

**Submit (book):** `POST /External/Estimate/CreateOrUpdateCustomerFromQuote` returns the redirect URL

### What the visitor sees

- Customer info (pre-filled from Step 1)
- Service address (from Step 2) — editable
- Billing address — defaults to service address with a "Same as service address" toggle
- After-pricing questions (e.g. "Special instructions for the team")
- Discount code field (optional)
- A calendar widget (Kendo) showing available dates for the cheapest selected line — visitor picks the **first job date** (and optionally a time)
- A payment-info section that varies by `PaymentProcessor`:
  - **CardConnect Hosted** (`PaymentProcessor.CardConnectHosted`): an iframe (`CardConnectTokenizerUrl`) that captures the card and returns `{ token, expiry }`. May also surface ACH (`CardConnectAchTokenizerUrl` + `CardConnectAchMid`) and a surcharge notice (`IsCardConnectSurchargeEnabled`).
  - **Authorize.Net Hosted** (`AuthorizeNetHosted`): an `Accept.js` token (`AuthorizeNetAccept` + `AuthorizeNetToken` from `GetHostedPaymentPage()`).
  - **Authorize.Net** (non-hosted): direct Accept.js client-side tokenization.
  - **Stripe / Stripe Hosted**: Stripe Elements client-side. (Note: the existing code branch is empty — Stripe paths are wired in `_Step3Partial.cshtml`.)
- Schedule preferences per scope: first-job tags (e.g. "Deep Clean"), service-set tags
- A "Book Now" button

### Server flow on Step 3 load

1. Check `IsBookedOrExpired(gid)`.
2. SignalR online tracking with **`autoProgressToQuoted: true`** — reaching Step 3 means the lead has seen pricing.
3. Populate scope IDs from the saved quote.
4. Fetch `AfterPricing` questions.
5. Pull saved addresses from the quote.
6. Look up the service company's payment processor and configure the matching tokenizer:
   - For CardConnect: `_cardConnectService.GetCardConnectTokenizerUrl()` + ACH variants if configured.
   - For Authorize.Net Hosted: build a hosted-payment-page token via `_authorizeNetService.GetHostedPaymentPage()`.
7. Fetch the schedule modal data (`GetPricingStep4Modal`) so the calendar can show available dates.
8. Strip HTML from text-area question values for safety.

### Server flow on `GetServiceTypeGroupAvailability`

This is a **complex** capacity-aware availability calculation:

1. Resolve the scope group's settings (`SettingsGroupRevenue`).
2. Determine `firstDayOfQuery`:
   - Today + 1 day baseline (cannot book today).
   - Add `ExternalBookingCutOffDays` (group setting) — e.g. require 3 days lead time.
   - If current time is past `ExternalBookingCutOffTimeOfDay`, push out one more day.
3. For each day in range:
   - If the group is hours-based (`AvailabilityType.Hours`):
     - Get scheduled employee hours for the day, multiplied by trainee position factor and average team efficiency.
     - Compare against `dayHours.ScheduledHours` minus already-booked hours.
   - If the group is revenue-based (`AvailabilityType.Revenue`):
     - Get the day-of-week revenue goal and already-booked revenue.
     - Compare against `dayOfWeekRevenue` minus already-booked revenue.
   - Honor any explicit override in `ServiceSetTypeGroupAvailability`.
4. Return the list of available date strings.

### Server flow on Book submit

`CreateOrUpdateCustomerFromQuote`:

1. Validate `FirstStartDate` is set.
2. Re-resolve `ServiceCompanyId` from the existing quote (so the booking always lands on the right branch).
3. Re-check franchise ZIP allow-list.
4. Order schedules by frequency precedence (`O, W, B, T, M`).
5. For multi-frequency bookings, stagger start dates by `GetDaysBetweenByServiceTypeId`.
6. Apply default first-job tags (e.g. `[11, 13]` = "First Time" + "In & Out Of Rotation") to the first scope.
7. Look up the existing customer + home (if any) via `GetCustomerHomeFromQuoteId`.
8. Persist question answers and detail lines.
9. Call `_customerQuoteService.CreateOrUpdateCustomerFromQuote(...)` — this is the big one:
   - Creates/updates `tblCustomerInformation`.
   - Creates `tblHomeInformation`.
   - Creates `tblCustomerQuoteDetailLine` rows for every booked frequency.
   - Creates `tblJob` + `tblTeamSchedule` + recurrence rows.
   - Returns a result with `RedirectUrl` (the Partner's "thank you" page or portal invite).
10. Fire confirmation emails (`SendQuoteBookedEmailMany`), customer-portal invite (`SendCustomerActivateEmail`).
11. Schedule `VerifyQuoteShouldStillBeInCampaign(...)`.
12. Geocode the address via `GoogleMapsHelper.GetGeocodeRequest(...)` and store lat/lng (Hangfire).
13. Apply Keap "QuoteBooked" tag.
14. Fire SignalR `leadBooked` event.
15. Return the `RedirectUrl` JSON.

### Step 3's two companion endpoints

- `ApplyDiscountCode(ExternalApplyDiscountCodeInput)` — validates a code and returns the discount detail; the JS adds it to the rate modifications list.
- `DeselectLine(DeselectLineInput)` / `RemoveServiceSetTypeFromQuote(RemoveServiceSetTypeInput)` — let the visitor remove a frequency or an entire scope from the in-progress quote.

---

## 8. Step 4 — Optional account creation

**Loader:** `GET /External/Estimate/Step4` returns `_Step4Partial.cshtml` (53 lines)

This step is shown only when the customer-portal feature is enabled and the visitor's email matched an existing customer record (`showAccountLogin = true` from Step 1's response). The visitor either logs in to the portal or accepts the activation invite.

> **Decision recorded:** Customer-portal flows are **out of scope** for the Partner rebuild. Skip this step entirely. The Lead API has no equivalent and the booking-confirmation email already drives portal activation if needed.

---

## 9. Async side effects

Every step fires Hangfire jobs and SignalR events. The Partner rebuild does **not** need to replicate these — calling the Lead API endpoints will trigger the same effects server-side. They are listed here so the rebuild engineer knows what is happening invisibly.

| Event | Trigger | Mechanism | Purpose |
|---|---|---|---|
| Lead email | After `CreateOrUpdateCustomerQuote` (10-min delay) | Hangfire `ITemplateService.SendLeadEmail` | Welcome + estimate link to the customer |
| No-service email | Same, when ZIP is outside service area and `ServiceCompanyId == 0` | Hangfire `ITemplateService.SendLeadNoServiceEmail` | Apologetic "we don't serve your area" |
| Quote estimate email | After `CreateOrUpdateCustomerQuoteDetails` (5-min delay) | `ITemplateService.SendQuoteEstimateEmailMany` | Sends the priced quote |
| Booked email | After `CreateOrUpdateCustomerFromQuote` (5s delay) | `ITemplateService.SendQuoteBookedEmailMany` | Confirmation |
| Portal activation invite | After booking, if portal feature enabled | `ITemplateService.SendCustomerActivateEmail` | Activate customer portal account |
| Campaign enrollment | After lead/quote/booking events | `ICampaignEmailAutomationService.External*` | Drip campaigns |
| Keap tag sync | After lead/quote/booking events | `IKeapService.ApplyKeapTags` | CRM tag application |
| UTM persist | When any utm_* param present | `ICustomerQuoteUtmService.CreateOrEdit` | Marketing attribution |
| Geocode | After booking | `IHomeInformationService.SaveLatLng` | Map view in office |
| `leadOnline` SignalR | Every step load with a known quote | `IHubService.UpdateSalesPipelineSignalR` | Office dashboard "online now" indicator |
| `leadCreated` SignalR | After `CreateOrUpdateCustomerQuote` | Same | Office pipeline view |
| `leadUpdated` SignalR | After `CreateOrUpdateCustomerQuoteDetails` | Same | Office pipeline view |
| `leadBooked` SignalR | After `CreateOrUpdateCustomerFromQuote` | Same | Office pipeline removes from "lead" view |

---

## 10. Feature flags that change behavior

These are evaluated via `CacheHelper.Current.AccessToFeature(Feature.X)`. They alter the existing form's UI/server logic. The Partner rebuild needs to know which behaviors come "for free" via the API and which are tied to the visiting tenant's feature mix.

| Flag | Effect on existing form | Implication for Partner build |
|---|---|---|
| `Sms_OptionalConsentCheckboxes` | If on, SMS consent checkboxes are optional; if off, both are required. | Partner must collect both consents and pass them along (Lead API has **no field** for this — gap §5). |
| `Quoting_OnlineHidePricingUntilDataSaved` | Hides the price summary on mobile until Step 3 data is saved. | UI-only; Partner can ignore. |
| `Quoting_RoundPrices` | Server rounds final prices to whole dollars. | Server-side; Partner sees rounded prices in the API response automatically. |
| `Franchise` | Activates the ZIP allow-list per branch. | API does not enforce this. Gap §1 (multi-branch routing covers it). |
| `CustomerPortal` | Enables Step 4 and the portal invite email. | Out of scope. |
| `TeamSizeAuto`, `TeamSizeManual` | Affect how teams are auto-assigned at booking. | API handles internally. |

---

## 11. State storage summary

| Where state lives | What's stored | Lifetime |
|---|---|---|
| **URL query string** | `c`, `cid`, `gid`, `sstgId`, `sstIds`, `Phone`, `Email` | Page load |
| **Hidden inputs in `Index.cshtml`** | `c`, `cid`, `gid` | Page session (re-posted with every AJAX call) |
| **Form fields in each step partial** | All visitor input | Per-step |
| **HTTP session (`Session[...]`)** | `OnlineQuoteId`, `OnlineSessionStart`, `ServiceCompanyId` (set by `base.SetUserCredentials`) | Visitor session |
| **Database** | `tblCustomerQuote`, `tblCustomerQuoteDetailGroup`, `tblCustomerQuoteDetailLine`, `tblCustomerQuoteContactInformation`, `tblCustomerQuoteUtm`, `tblCustomerQuoteQuestion` | Persistent |
| **`CacheHelper.Current` (in-memory cache)** | Service-company config (postal length, label, payment processor, feature flags, etc.) | Server lifetime, refreshed on settings change |

The Partner rebuild **doesn't have access** to session or `CacheHelper`. State has to live in the React app (in-memory + URL) and the server-side token broker.

---

## 12. Internal-only behavior the rebuild can drop

The following exists in `EstimateController` but should **not** be carried into the Partner build:

- `SendOnlineStatusUpdate(...)` and all SignalR `leadOnline` plumbing — the office dashboard's "online now" indicator works only when CastleQuick's own form is the one being filled out. A Partner-hosted form is invisible to it. **No-op for Partners.** (Acceptable degradation.)
- `Session["OnlineQuoteId"]` / `Session["OnlineSessionStart"]` — same reason.
- `?c=` and `?cid=` resume support — explicitly out of scope.
- `Step4` portal-account creation — out of scope.
- `Homes` / `ChooseHome` (Step 1.3 for logged-in customers) — out of scope.
- `Testimonials`, `Terms` standalone pages — Partner will provide their own marketing pages.

---

## Reference: file map

| File | What it is |
|---|---|
| `CastleKeeper.Web/Areas/External/Controllers/EstimateController.cs` | The 1,501-line controller. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/Index.cshtml` | Wizard shell. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_Step1Partial.cshtml` | Contact + scope picker form. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_GroupScopeQuestionForm.cshtml` | Scope group + scope picker + before-pricing questions. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_ScopePicker.cshtml` | Just the scope checkboxes. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_QuestionList.cshtml` | Re-renderable question list. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_Step2Partial.cshtml` | Frequency + price preview + during-pricing questions. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_Step3Partial.cshtml` | Address + payment + schedule + after-pricing questions. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_Step4Partial.cshtml` | Portal account create. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_BookedOrExpired.cshtml` | Shown when the quote is no longer editable. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_MarketingText.cshtml` | The marketing copy card. |
| `CastleKeeper.Web/Areas/External/Views/Estimate/_Homes.cshtml` | Logged-in "choose existing home" flow. |
| `CastleKeeper.Web/view-resources/Areas/External/Estimate/*.js` | Front-end glue (loads partials, posts forms, updates summary). |
