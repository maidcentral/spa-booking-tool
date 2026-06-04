## Problem Statement

MaidCentral partners (cleaning businesses) want to take bookings on their own websites, but the current `maidcentral-booking-tool` only works as a standalone Next.js app that a technically competent partner has to clone, configure with their machine API credentials, and deploy to their own infrastructure. The majority of partners cannot or will not do this. Partners who could self-host still end up with an app that looks like a separate site — it does not blend with their existing web presence.

Partners need a way to embed MaidCentral's booking flow directly into their existing website with **zero backend code on their side** and a look-and-feel that inherits from their site's own styling.

## Solution

A JavaScript widget partners drop into their site via a script tag plus a target `<div>`. The widget authenticates itself by calling a new MaidCentral-hosted token broker endpoint (keyed by a public partner ID, gated by a server-side Origin check against each partner's configured allowed-domains list). The widget then calls MaidCentral's existing booking API directly from the browser using the short-lived token it received. Partner credentials never leave MaidCentral's servers. The widget mounts into real DOM (not an iframe, not a shadow root), so it inherits the partner's fonts, resets, and ambient styling automatically.

Partners configure the widget — enable it, list allowed domains, set primary/secondary color and logo, copy their embed snippet — through a new "Booking Widget" tab inside MaidCentral's existing customer portal. No separate signup, no separate billing, no separate credential storage.

## User Stories

1. As a cleaning business owner, I want to embed a booking form on my website by pasting a script tag and a div, so that I can accept online bookings without hiring a developer.
2. As a cleaning business owner, I want the booking widget on my site to inherit my website's fonts and colors by default, so that it does not look like a bolted-on third-party form.
3. As a cleaning business owner, I want to choose a primary color, secondary color, and logo for the widget, so that I can match my brand when the default inheritance is not enough.
4. As a cleaning business owner, I want to restrict which domains can use my widget snippet, so that competitors or bad actors cannot copy my snippet and trigger booking attempts that waste my team's time.
5. As a cleaning business owner, I want to find, copy, and test my embed snippet from inside my existing MaidCentral portal account, so that I do not have to learn a new system or remember new credentials.
6. As a cleaning business owner, I want to see a preview of what the widget will look like before I paste it onto my site, so that I can catch branding issues before my customers do.
7. As a MaidCentral partner, I want the widget to continue working across token expirations without any work on my part, so that booking never fails silently during a long customer session.
8. As a MaidCentral partner, I want the widget to work on whatever website platform I use (WordPress, Squarespace, Shopify, custom HTML), so that my platform choice does not lock me out of online booking.
9. As an end customer visiting a cleaner's website, I want to complete a booking entirely on that cleaner's domain, so that I never feel like I was handed off to some third-party tool I do not trust.
10. As an end customer, I want the booking form's fonts, spacing, and buttons to match the rest of the cleaner's site, so that the experience feels cohesive.
11. As an end customer on a slow mobile connection, I want the widget to not noticeably slow down the page I am on, so that I still want to book.
12. As an end customer paying by card, I want the payment form to be secure (tokenized, PCI-friendly), so that my card data is not exposed on a small cleaning company's site.
13. As a MaidCentral partner's web developer, I want the widget to emit events when the customer completes a booking (or an error occurs), so that I can fire analytics pixels, update my CRM, or redirect the customer to a branded thank-you page.
14. As a MaidCentral partner's web developer, I want to configure a simple success redirect without writing JavaScript, so that the common "send them to /thanks" case is a one-line attribute.
15. As a MaidCentral partner trying the widget for the first time, I want to test it on `localhost` or a staging domain, so that I can integrate it before putting it on production.
16. As a MaidCentral engineer, I want the widget code to live in the same repository as the existing booking tool, so that we have one code path to maintain, not two.
17. As a MaidCentral engineer, I want to cleanly remove the current single-tenant environment-variable configuration path after launch, so that we are not maintaining both the old and new authentication flows.
18. As a MaidCentral engineer, I want the token broker endpoint to reject requests from unlisted origins with a clear error, so that partners can diagnose misconfiguration without opening a support ticket.
19. As a MaidCentral engineer, I want to add a new partner's widget configuration as columns on the existing partner record rather than in a new table, so that tenant-scoping and permissions reuse infrastructure we already have.
20. As a MaidCentral support engineer, I want a partner's widget configuration (enabled state, allowed domains, last successful token issuance) visible in an internal admin view, so that I can diagnose "it's not working" tickets without a screen-share.
21. As a MaidCentral security reviewer, I want the partner's machine API credentials to never reach the browser, so that a widget XSS on a partner's site cannot escalate into full MaidCentral API access.
22. As a MaidCentral security reviewer, I want the tokens the widget does use to be short-lived and scoped to lead/quote/booking operations only, so that the blast radius of a leaked token is bounded.
23. As a MaidCentral partner, I want to disable my widget immediately from the portal if I suspect abuse, so that I can stop bleeding without filing a support ticket.
24. As a MaidCentral partner, I want to update my allowed-domains list without contacting support, so that launching my widget on a new subdomain is a self-service change.
25. As a MaidCentral engineer, I want the CardConnect payment tokenizer iframe to not load until the customer reaches the payment step, so that the widget's initial page-weight impact on partner sites is minimized.
26. As a MaidCentral engineer, I want the widget's compiled CSS to not interfere with the partner's page styling (no global resets, no utility-class collisions, no `!important` font overrides), so that partners do not file CSS bugs we cannot reproduce.
27. As a MaidCentral engineer, I want multiple widget instances on the same page to not collide (no duplicated DOM IDs, no shared global state), so that demo pages and pricing-comparison pages work.
28. As a MaidCentral partner, I want clear documentation with a copy-paste snippet and a 5-minute quickstart, so that integration actually takes 5 minutes.
29. As an existing MaidCentral internal deployment of the booking tool, I want a clean migration path to becoming "just another partner record," so that we are not the exception to the new multi-partner model.
30. As a MaidCentral engineer, I want the widget JavaScript file to be served from an existing MaidCentral domain (not a new subdomain), so that we avoid new DNS, TLS, and CDN infrastructure.

## Implementation Decisions

### Architecture

- **Embed mechanism:** native-DOM JavaScript bundle mounted into a partner-provided container element. Not an iframe. Not a web component with shadow DOM. Not a WordPress plugin. Not a partner-self-hosted Next.js deployment.
- **Public mount API:** a single global function exposed by the bundle, invoked with a CSS selector (or element reference) and a config object. Config includes the partner identifier, optional theme overrides, and optional event callbacks / success redirect URL.
- **Authentication flow:** on mount, the widget calls the new token broker endpoint on MaidCentral's backend, passing the partner identifier. The browser automatically sends the `Origin` header. The server validates the origin against the partner's configured allowed-domains list, mints a short-lived MaidCentral access token from the partner's stored refresh token, and returns it. The widget then calls MaidCentral's existing booking API directly from the browser using that token. Token refresh is handled transparently by the widget's token client before expiry.
- **No cross-cutting proxy of the booking API.** Only the token broker endpoint is new on MaidCentral's backend. All other MaidCentral API calls continue to be hit directly from the browser, relying on the existing wildcard CORS policy.

### Module layout

- **Widget core** — the extracted React booking flow. Accepts the access token and configuration via props. No Next.js-specific imports. No direct environment-variable reads. Emits lifecycle events at start, completion, error, and step boundaries.
- **Vanilla mount adapter** — the public surface. A plain JavaScript API that mounts the React core into a partner's container and wires up the event callbacks / redirect behavior.
- **Token broker client** — the in-widget async module that calls the token broker endpoint, schedules refreshes before expiry, retries transient failures with backoff, and surfaces fatal errors through the widget's error callback.
- **Token broker endpoint** — a new HTTP handler on MaidCentral's backend. Responsibilities: partner lookup, origin validation, refresh-token-driven token minting, error classification.
- **Origin validator** — a pure, dependency-free module on the backend. Takes an origin string and a list of allowed domain patterns and returns a boolean. Handles exact host matching, port-agnostic matching, localhost during development, and optional subdomain wildcards (e.g., `*.phoenixmaids.com`). Isolated so it is trivially unit-testable.
- **Partner widget config store** — persistence layer for the new per-partner fields. Columns added to the existing partner record, not a separate table: enabled flag, allowed-domains list, encrypted refresh token, theme overrides (primary color, secondary color, logo URL).
- **Admin portal tab** — a new "Booking Widget" section in MaidCentral's existing customer portal. Presents: enable/disable toggle, allowed-domains editor (one per line, with validation), theme fields, copy-to-clipboard embed snippet, and a live preview.
- **Theming layer** — translates mount-time theme options into CSS custom properties on the widget's root container. The existing `--primary-color` variable continues to be the hook point; new secondary-color and logo-URL hooks are added.

### API contract: token broker endpoint

- Verb and path: `GET /api/widget-token`.
- Query parameters: `partnerId` (required).
- Headers: `Origin` is read; no other headers required.
- Success response: HTTP 200 with a JSON body containing the short-lived access token and its expiry in seconds.
- Partner not found: HTTP 404.
- Partner widget disabled: HTTP 403 with an error code distinguishing this from an origin mismatch.
- Origin not in partner's allowed-domains list: HTTP 403 with a distinct error code so the widget can surface a "this widget is not authorized on this domain" message.
- Upstream `/token` failure: HTTP 502.
- All error responses return a JSON body with a stable error code string, so the widget and the admin UI can present useful messages without string-matching free-form prose.

### Schema additions

All new fields live on the existing partner record. No new tables. Fields:

- Widget enabled (boolean, default false).
- Allowed domains (list of domain patterns).
- Encrypted refresh token (at-rest encryption via the existing MaidCentral secret management; plaintext refresh tokens never written to disk or logs).
- Theme primary color (nullable hex string).
- Theme secondary color (nullable hex string).
- Theme logo URL (nullable URL string).

### Widget surface

- Mount configuration: partner identifier (required), optional primary color, optional secondary color, optional logo URL, optional event callbacks (completion, error, step change), optional success redirect URL.
- Lifecycle events: booking completed (includes lead ID, quote ID, booking ID, booking date, total amount, customer email), error occurred (includes error code and human-readable message), step changed (includes current step name — useful for partner funnel analytics).
- Style isolation strategy: Tailwind's preflight is disabled, utility classes are compiled with a project-specific prefix, and no `!important` declarations are emitted against top-level elements like `html`, `body`, or `*`. Partner's page styling wins by default; the widget supplies only the styling it needs.
- Payment tokenizer: the CardConnect iframe is mounted lazily, only when the customer reaches the payment section of the flow. No DOM IDs shared across widget instances.

### Build pipeline

- The widget is built as a library (not a Next.js app). The build produces an IIFE bundle suitable for a plain `<script src>` include. The bundle is served from the existing MaidCentral application domain.
- A single, unversioned URL for v1. Cache headers are set so the CDN (if present) can serve it hot and fresh releases are reflected on cache purge.

### Migration

Clean break from the current single-tenant, environment-variable-driven deployment. After launch, the `API_USERNAME` / `API_KEY` / `NEXT_PUBLIC_API_BASE_URL` configuration path is removed. Any existing internal MaidCentral deployment of the booking tool is migrated to a partner record (with appropriate allowed domains) and begins consuming the widget the same way external partners do. No dual-mode — the application either runs as the widget (and its backend) or it does not.

### Dead-code cleanup surfaced by the refactor

- The `lead/create-or-update` server route currently contains a dead SMS / phone-code authentication flow that does not reflect the actual MaidCentral API. It will be rewritten to use the same OAuth2 password-grant `/token` pattern as the `auth` route.
- The global Poppins font rule declared with `!important` on `html`, `body`, and `*` is removed; the widget does not override host page typography.
- The fixed DOM ID used by the CardConnect tokenizer hidden input is replaced with a scoped element reference so multiple widget instances do not collide.
- Next.js-specific imports (`next/link`, `next/image`, `next/navigation`) are removed from the widget code path so the library build can succeed outside a Next.js runtime.

## Testing Decisions

Testing scope for v1 is deliberately minimal, in line with the MVP posture.

- **Origin validator module.** Pure function. Unit-tested with a matrix of cases: exact match, case-insensitive host, port-agnostic match, localhost variants, subdomain wildcard, disallowed origin, malformed origin, empty allowed-domains list. This module is the security boundary for the token broker, so test coverage here is non-negotiable.
- **Token broker client.** Unit-tested in isolation with mocked fetch. Cases: successful token acquisition, pre-expiry refresh, 401 response triggers a re-fetch, repeated failures surface through the widget's error callback, backoff is respected.
- **What we do not test for v1.** No unit tests for React components. No end-to-end tests of the full booking flow. No visual regression. No load tests on the token broker. Smoke testing before launch is manual: embed on a throwaway WordPress page, a static HTML page, and a Next.js app, run through a full booking on each.
- **Prior art.** Jest is already wired up in the repo (`jest.config.js`, `jest.setup.js`), with `@testing-library/react`, `jest-axe`, and `ts-jest`. New tests follow existing Jest conventions and live next to the module under test.

A good test here means: exercises the module's external contract (input → output, input → side effect), not its internal structure. The origin validator's tests should not mock anything. The token broker client's tests mock only `fetch`, not internal state.

## Out of Scope

The following are explicitly deferred from v1:

- Client-side error reporting / Sentry / any observability tooling in the widget bundle.
- Closed beta, feature-flagged rollout, or any staged release mechanism — the widget tab appears for every partner on launch day.
- A React component npm package (idiomatic React API alongside the vanilla mount function). Possible v2 addition from the same source.
- Hosted landing pages for partners who lack a website (`app.maidcentral.com/book/partnerId`). Possible v2.
- A serverless-function / partner-hosted token broker alternative for partners who would prefer not to rely on MaidCentral's broker.
- Versioned widget URLs. v1 uses a single unversioned URL; versioning is introduced only when a backwards-incompatible change forces it.
- Aggressive bundle-size optimization (full code-splitting, dependency trimming of Radix / Framer Motion / Lucide, gzipped target under 300 KB). v1 ships with lazy-loading of the CardConnect tokenizer and nothing more.
- Partner-facing usage analytics, lead dashboards, or usage-based billing.
- Support for CardConnect alternatives / other payment gateways.
- A "multi-step" layout variant of the booking flow. v1 ships the single-page flow only.
- Success metrics tracking — defined metrics, dashboards, or explicit acceptance criteria beyond "the widget works."
- Accessibility audit beyond what the existing form already provides.
- Internationalization beyond what the existing form already provides.

## Further Notes

- The `Origin` header is a browser-enforced value and is sufficient for the v1 security model when combined with short-lived tokens limited to lead/quote scope. This model is not sufficient against an attacker willing to forge headers (e.g., via curl or a server-side forgery); the mitigation is that forged requests still require knowledge of a valid partner ID and still receive a token whose blast radius is bounded to lead/quote operations on that one partner.
- Refresh tokens are long-lived and must be encrypted at rest using existing MaidCentral secret-management primitives. Plaintext refresh tokens must not appear in logs or error reports.
- The widget bundle is expected to land in the 600–900 KB gzipped range at v1. This is acknowledged and accepted for MVP; bundle-size work is deferred. If the first few partner integrations produce Core Web Vitals complaints, that becomes the trigger for bundle-size work.
- The widget intentionally inherits the partner's page font by default. Partners who want a specific font inside the widget can set it through their page's own CSS targeting the widget's container class.
- The widget does not persist any customer-identifying data in `localStorage` or `sessionStorage` across page loads. Session state lives in memory for the duration of the mount.
- MaidCentral already enables wildcard CORS on its API, so the widget calling the booking endpoints directly from any partner's domain works without further CORS configuration. This was verified in the architecture session.
