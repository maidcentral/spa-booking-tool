# 03 — Gap Analysis

This document lists every feature the existing online booking form has that the **public Lead API cannot currently support**. Each gap has:

- **Severity** — Critical / Important / Nice-to-have
- **Symptom** — what a Partner can't do without it
- **Workaround** — what the Partner can do today
- **Proposed API addition** — what CastleQuick should build to close the gap

This list is the punch-list for backend work needed before Partners can reach feature parity. Severity is from the **Partner's perspective**: Critical = the form won't work for many Partners; Important = workarounds are messy; Nice-to-have = cosmetic or low-frequency.

---

## Severity summary

| # | Gap | Severity |
|---|---|---|
| 1 | Multi-branch ZIP routing | **Critical** |
| 2 | Discount-code validation | **Critical** |
| 3 | Marketing text per scope group (rich) | Important |
| 4 | Terms / Testimonials per scope group | Important |
| 5 | SMS consent capture fields | **Critical** (compliance) |
| 6 | Modify a draft quote (deselect line / remove scope) | Important |
| 7 | Per-tenant CardConnect tokenizer URL | Important |
| 8 | "Outside service area" boolean in lead response | Nice-to-have |
| 9 | Configurable lead-email delay | Nice-to-have |
| 10 | Lead `ipAddress` capture | Nice-to-have |
| 11 | Default first-job tag policy | Nice-to-have |

---

## §1. Multi-branch ZIP routing — **Critical**

### Symptom

Partners with more than one branch (a `ServiceCompanyGroup` containing multiple `ServiceCompany` rows) cannot route a visitor's lead to the right branch. The Lead API's `Authorization` header carries a single token, which carries a single `ServiceCompanyId`. Whichever token the Partner uses, every lead lands in that one branch.

The existing form solves this with `EstimateController.GetServiceCompanyId(postalCode)`, which:
1. Reads the `ServiceCompanyGroupId` from the subdomain.
2. Looks up `tblZoneZip` for the visitor's ZIP, scoped to that group.
3. Returns the matching branch's `ServiceCompanyId`.

### Workaround (today)

The Partner backend must:
1. Provision an API user per branch.
2. Maintain a ZIP-to-branch lookup table on its own side (denormalized from `GET /api/Lead/PostalCodes`, but `PostalCodes` returns per-branch — Partner has to call it once per branch and stitch the results).
3. On every lead submit, look up which branch's token to use, then call `POST /CreateOrUpdate` with that token.
4. Re-route mid-flow if the visitor changes their ZIP.

This is workable but fragile, and requires Partners to manage N tokens.

### Proposed API addition

**Option A — Group-level lead endpoint:**

```
POST /api/group/Lead/CreateOrUpdate
Authorization: Bearer {group-scoped token}

{ ...same body as /api/Lead/CreateOrUpdate... }
```

The group token has access to all branches in the group. The server resolves `ServiceCompanyId` from the ZIP (same algorithm as `GetServiceCompanyId`) and routes the lead. Returns the resolved `serviceCompanyId` in the response.

Add `POST /api/group/Lead/CreateOrUpdateQuote`, `POST /api/group/Lead/BookQuote`, `POST /api/group/Lead/CalculatePrice` with the same model.

**Option B — Routing helper:**

```
GET /api/Lead/RouteByPostalCode?postalCode=90210
Authorization: Bearer {group-scoped token}

→ { "serviceCompanyId": 17, "outsideServiceArea": false, "isZipApproved": true, "branch": { "name": "Beverly Hills", "phone": "..." } }
```

Partner uses the result to pick the right per-branch token and proceeds with the normal `/api/Lead/*` endpoints. Lower-impact, requires Partner to still maintain N tokens.

**Option A is recommended.** Closes the gap in one move and matches how the existing internal form works.

### Coverage benefit

Closes the **Franchise** feature gap as well — the same routing layer can enforce `IsZipCodeApproved` and refuse the request if the visitor's ZIP isn't in the franchise's allowed list.

---

## §2. Discount-code validation — **Critical**

### Symptom

The existing form has `ApplyDiscountCode(ExternalApplyDiscountCodeInput)` which validates a code, returns the rate-modification details, and lets the JS add it to the price calc. The API has no equivalent. Partners cannot offer promo codes ("SPRING25") on their forms.

### Workaround (today)

The Partner can statically configure rate-modification IDs that map to known discount codes and add them to `RateModifications` arrays on `CalculatePrice` and `CreateOrUpdateQuote`. This bypasses code-validity checks (expiry, usage limits, scope restrictions) and won't credit the discount on the back end the way the existing system does.

### Proposed API addition

```
POST /api/Lead/ApplyDiscountCode

{
  "discountCode": "SPRING25",
  "scopeGroupId": 3,
  "scopesOfWork": [ ... ]                  // same shape as CalculatePrice
}

→ ApiResponse<DiscountValidationResultDto>
{
  "isValid": true,
  "discountCode": "SPRING25",
  "rateModificationId": 89,
  "name": "Spring Sale",
  "expiresAt": "2026-06-30T23:59:59Z",
  "appliesToScopeIds": [15, 16],
  "isPercentage": true,
  "amount": 25.0,
  "isRecurring": false
}

→ on invalid: { "isValid": false, "reason": "Expired" | "InvalidCode" | "AlreadyUsed" | "ScopeNotEligible" }
```

The Partner adds the returned `rateModificationId` (with appropriate quantity / recurring flag) to the `rateModifications` array on subsequent `CalculatePrice` and `CreateOrUpdateQuote` calls. The server validates the code again on quote/book to prevent client tampering.

---

## §3. Marketing text per scope group (rich) — Important

### Symptom

The existing form pulls per-scope-group HTML marketing copy via `IServiceSetTypeGroupService.GetMarketingText(...)` and renders it in the right-hand panel. The API's `GET /AboutCompany` returns company-wide branding (`FooterAbout`, `PublicMastheadImageUrl`, etc.) but not per-scope-group HTML.

`ScopeGroupDto` does include a `MarketingText` field (see `LeadDtos.cs`), but verify whether it's populated server-side and whether it's a short string or full HTML body.

### Workaround (today)

Partner supplies their own marketing copy in their CMS. Static, doesn't reflect the tenant's current marketing choices.

### Proposed API addition

If `ScopeGroupDto.MarketingText` is already populated end-to-end, document it explicitly in `lead-api.md` and the gap is closed. If not, populate it and add:

```
GET /api/Lead/ScopeGroupMarketing?scopeGroupId=3

→ ApiResponse<{
  "scopeGroupId": 3,
  "marketingText": "<rich html>",
  "marketingMediaUrl": "https://...",
  "ctaText": "Get Your Free Quote",
  ...
}>
```

---

## §4. Terms / Testimonials per scope group — Important

### Symptom

The existing form has `Terms(int? id)` (returns terms-of-service for a scope group) and `Testimonials(TestimonialInput)` (returns reviews for a scope group). No API equivalent.

### Workaround (today)

Partner supplies their own terms link and testimonials carousel (perhaps embedding a Google Reviews widget or similar). Won't reflect the tenant's stored testimonials or per-group terms.

### Proposed API addition

```
GET /api/Lead/Terms?scopeGroupId=3

→ ApiResponse<{ "scopeGroupId": 3, "termsHtml": "..." }>


GET /api/Lead/Testimonials?scopeGroupId=3&maxResults=9&serviceCompanyId={optional}

→ ApiResponse<List<TestimonialDto>>
```

Where `TestimonialDto` mirrors what `IJobResponseService.GetTestimonialsForGroup` returns internally.

---

## §5. SMS consent capture fields — **Critical (compliance)**

### Symptom

The existing form requires both `smsConsentTransactional` and `smsConsentMarketing` checkboxes (unless the tenant has the `Sms_OptionalConsentCheckboxes` feature). These map to TCPA-compliance flags stored on the lead/customer record. The Lead API has **no fields** for these. Partners that pass leads through the API will not have legally-recorded consent for follow-up SMS, even if they collect the checkboxes on their UI.

### Workaround (today)

Partner records consent on its own side (e.g. its own audit log), but CastleQuick's downstream SMS sends will use the customer's previously-recorded consent state — which may be empty. **High legal risk.** Partners may be forced to disable SMS marketing entirely.

### Proposed API addition

Extend `LeadCreateOrUpdateDto` (or add a sister DTO):

```diff
{
  "firstName": "...",
  ...
+ "smsConsentTransactional": true,
+ "smsConsentMarketing": true,
+ "smsConsentTimestamp": "2026-04-20T14:00:00Z",  // optional, server defaults to now
+ "smsConsentIpAddress": "203.0.113.42"            // optional, for audit
}
```

Persist these on `tblCustomerQuote` (and propagate to `tblCustomerInformation` on booking).

Same fields should be accepted by `POST /CreateOrUpdateQuote` and `POST /BookQuote` so a late-changing consent state can be captured.

---

## §6. Modify a draft quote — Important

### Symptom

The existing form lets a visitor remove a frequency from a saved quote (`DeselectLine`) or remove an entire scope (`RemoveServiceSetTypeFromQuote`). The API has no endpoint for either. Partners can only **overwrite** a quote (re-call `CreateOrUpdateQuote` with the desired final state).

The overwrite workaround is correct in result but creates extra emails and SignalR events. It also re-fires the campaign enrollment timer.

### Workaround (today)

Re-call `POST /CreateOrUpdateQuote` with the new scope/frequency list and `sendQuoteEmail: false` to suppress the duplicate email.

### Proposed API addition

```
POST /api/Lead/RemoveScopeFromQuote

{
  "leadId": 58231,
  "quoteId": "{guid}",
  "scopeOfWorkId": 15
}

POST /api/Lead/DeselectFrequency

{
  "leadId": 58231,
  "quoteId": "{guid}",
  "scopeOfWorkId": 15,
  "frequencyId": "E2"
}
```

Both no-ops if the line/scope isn't in the quote. Both throw if the quote is already booked.

---

## §7. Per-tenant CardConnect tokenizer URL — Important

### Symptom

The existing form fetches `_cardConnectService.GetCardConnectTokenizerUrl()` server-side and passes it to the Step 3 view. The Partner has no way to discover the right tokenizer URL via the API — they have to hard-code it per branch.

### Workaround (today)

Hard-code the tokenizer URL pattern (`https://fts-uat.cardconnect.com/itoke/ajax-tokenizer.html` for sandbox, `https://fts.cardconnect.com/itoke/ajax-tokenizer.html` for production) and treat the per-tenant MID as a build-time constant. Works, but breaks if a tenant switches MIDs or environments.

### Proposed API addition

```
GET /api/Lead/PaymentConfig

→ ApiResponse<{
  "paymentProcessor": "CardConnectHosted",
  "cardConnectTokenizerUrl": "https://...",
  "cardConnectAchTokenizerUrl": "https://...",       // null if ACH not configured
  "cardConnectAchMid": "...",                        // null if ACH not configured
  "isCardConnectSurchargeEnabled": false
}>
```

Returns null/empty for non-CardConnect tenants (in case future API expansion supports more processors).

---

## §8. "Outside service area" boolean in lead response — Nice-to-have

### Symptom

The existing `CreateOrUpdateCustomerQuote` returns `validZip: !postalCheck.OutsideServiceArea`. The API's `POST /CreateOrUpdate` doesn't return this — Partner has to call `GET /PostalCodes` separately and filter client-side.

### Workaround

Two API calls. Cheap; not painful.

### Proposed API addition

Add `outsideServiceArea: bool` to `CustomerQuoteDto` (the response of `POST /CreateOrUpdate` and `GET /Lead`). One-line change.

---

## §9. Configurable lead-email delay — Nice-to-have

### Symptom

The existing form schedules the lead-welcome email with a 10-minute delay (gives sales a chance to phone first). The API sends it immediately. If a Partner wants the delayed-send behavior, there's no toggle.

### Workaround

Pass `sendLeadEmail: false` and have the Partner trigger the email on its own schedule via Zapier / Keap / etc.

### Proposed API addition

Add `sendLeadEmailDelayMinutes: int?` to `LeadCreateOrUpdateDto`. Default `0`. If set, schedule the email accordingly.

---

## §10. Lead `ipAddress` capture — Nice-to-have

### Symptom

The existing booking action captures `Request.ServerVariables["REMOTE_ADDR"]` and stores it on `CreateOrUpdateCustomerFromQuote.IpAddress`. The API has no `ipAddress` field on any lead/quote DTO.

### Workaround

None on the public API.

### Proposed API addition

Add `ipAddress: string?` to `LeadCreateOrUpdateDto`, `CreateOrUpdateQuoteDto`, and `BookQuoteDto`. Persist to existing `IPAddress` columns. Useful for fraud auditing and TCPA compliance.

---

## §11. Default first-job tag policy — Nice-to-have

### Symptom

The existing form auto-applies tag IDs `[11, 13]` ("First Time" + "In & Out Of Rotation") to the first scope's first job. The API requires the Partner to pass these explicitly via `firstJobTagIds`. Different tenants may have these tags at different IDs — there's no way to discover them.

### Workaround

Partner calls `GET /Tags` and filters for tags whose names match (or stores the IDs as configuration).

### Proposed API addition

Either:
- (a) Move the auto-tag default into the booking service so the API matches the existing form's behavior, **or**
- (b) Add `GET /api/Lead/DefaultBookingTags` that returns the tenant's configured default first-job tags.

Option (a) is cleaner and matches what an internal user would expect.

---

## Other behaviors covered without an API gap

These are listed for completeness — they exist in the existing form but are **already handled** by the API or **explicitly out of scope** per `README.md`.

| Behavior | Status |
|---|---|
| `?c=` resume by encrypted token | Out of scope |
| `?cid=` customer-portal entry | Out of scope |
| Step 4 portal account creation | Out of scope |
| `Homes` / `ChooseHome` for logged-in customers | Out of scope |
| Capacity-aware availability | Covered by `GET /Availability` |
| Phone normalization | Covered |
| Lead de-dup by phone/email | Covered (`allowDuplicates`) |
| ZIP-vs-zone lookup | Covered (per-branch) |
| Quote-status auto-progression to "Quoted" | Covered |
| Booking-status auto-progression to "Booked" | Covered |
| Hangfire emails (lead, quote, booked, portal) | Covered |
| Keap tag sync | Covered |
| Campaign enrollment | Covered |
| Geocoding | Covered |
| `Quoting_RoundPrices` | Covered |
| Rooms-based pricing | Covered (server populates rooms) |

---

## Cross-reference

- For where each gap appears in the rebuild flow, see [`02-flow-mapping.md`](./02-flow-mapping.md).
- For how the React app should stub each gap, see [`04-react-build-spec.md`](./04-react-build-spec.md) §Stubs for known gaps.
