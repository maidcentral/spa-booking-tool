# Online Booking Form — Partner Rebuild Documentation

**Audience:** Partner engineers (and AI assistants) tasked with rebuilding the CastleQuick / MaidCentral online booking form against the public Lead API.

**Goal:** Give Partners everything they need to build a customized customer-facing booking form (e.g. a React SPA embedded in their marketing site) that produces the same business outcome as the internally-hosted form at `/external/estimate`, using **only** the endpoints exposed by `/api/Lead/*`.

---

## What's in this folder

| File | Purpose |
|---|---|
| [`01-existing-system.md`](./01-existing-system.md) | Deep walk-through of how the **current** EstimateController booking form works — every step, every server action, every Razor partial, every feature flag, every async side effect. Read this first to understand what the rebuild must replicate. |
| [`02-flow-mapping.md`](./02-flow-mapping.md) | For each EstimateController action, the corresponding Lead API endpoint(s) — what's preserved, what changes shape, what the API does for you automatically that the existing form did manually. |
| [`03-gap-analysis.md`](./03-gap-analysis.md) | Every feature the existing form has that the Lead API **cannot currently support**, ranked Critical / Important / Nice-to-have, with a proposed API addition for each. This is the punch list of work CastleQuick needs to do before Partners can reach feature parity. |
| [`04-react-build-spec.md`](./04-react-build-spec.md) | High-level blueprint of the partner React app — architecture, screens, state shape, API call sequencing, payment-tokenizer integration, and how to handle the documented gaps. Not code; a specification. |

## What's *not* in this folder (and where to find it)

- **Lead API endpoint reference, request/response shapes, auth, multi-tenancy, response envelopes, error conventions** → [`../lead-api.md`](../lead-api.md). Authoritative; do not duplicate.
- **All other API areas** (Admin, Portal, Host, etc.) → [`../README.md`](../README.md) and [`../controllers/`](../controllers/).
- **The React reference implementation itself** → lives in a separate repository. This folder is the spec, not the code.

## Reading order

1. Skim **`../lead-api.md`** sections 1–7 to internalize concepts, auth, and the high-level booking workflow.
2. Read **`01-existing-system.md`** end-to-end — this is the single biggest knowledge-transfer document in the set.
3. Read **`02-flow-mapping.md`** alongside `01-existing-system.md` to see how each piece translates.
4. Read **`03-gap-analysis.md`** to understand what the Partner build won't be able to do day-one.
5. Use **`04-react-build-spec.md`** as the build brief.

## Prerequisites for a Partner build

A Partner needs all of the following before they can ship a booking form built on the Lead API:

| Item | Where to get it |
|---|---|
| API user credentials (username + password) per branch | Created in the CastleQuick admin UI; user must have the `Api` internal role. |
| `/token` endpoint integration | Documented in `../lead-api.md` §3. **Must be called server-side** — never embed credentials in the browser. |
| A token-broker backend (or equivalent) | The Partner site must hold credentials and short-lived tokens server-side; the browser receives only a per-request scoped JWT or a session cookie that authorizes the proxy. |
| CardConnect Tokenizer iframe URL | Returned by an internal endpoint today; gap-listed for the public API in `03-gap-analysis.md`. The CardConnect-hosted CDN URL is documented in `04-react-build-spec.md`. |
| Branch (`ServiceCompanyId`) → API user mapping | Each branch the Partner serves needs its own API user. The Partner backend selects the correct user based on visitor ZIP (this is part of the multi-branch gap — see `03-gap-analysis.md`). |

## Scope decisions (locked)

These were settled before this doc set was written. They shape every recommendation:

| Decision | Value |
|---|---|
| Partner auth | API credentials → `/token` |
| Payment processor coverage | **CardConnect only** (matches the API). Authorize.Net / Stripe are not in scope. |
| Multi-branch ZIP routing | Some Partners have multiple branches → flagged as **Critical gap**. |
| `?c=` resume-by-link feature | Out of scope. |
| Discount codes | In scope → flagged as **Critical gap** (no API endpoint today). |
| Marketing text / Terms / Testimonials per scope group | Gap — Partner will supply their own copy unless we add endpoints. |
| Customer-portal flows (Step 4 login, "choose existing home") | Out of scope. |
| React app location | Separate repository. This folder is documentation only. |

---

*Last updated: 2026-04-20*
