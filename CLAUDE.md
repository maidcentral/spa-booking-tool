# CLAUDE.md

Guidance for Claude Code (or any AI assistant) when working in this repository.

## Critical API rules

**Never invent MaidCentral API endpoints.** All MaidCentral endpoints in use are
enumerated in `API_ENDPOINTS.md`. If you need a new endpoint, ask the user for
the correct URL rather than guessing from naming conventions.

## Project overview

MaidCentral Booking Tool — a Next.js 15 / React 19 / TypeScript 5 sample
application that demonstrates how to build a customer-facing booking form
against the MaidCentral API. Tailwind CSS v4 for styling, Radix UI + shadcn-
style primitives for components.

## Development commands

```bash
npm install        # install dependencies
npm run dev        # run dev server (Turbopack)
npm run build      # production build
npm start          # start production server
npm run lint       # ESLint
npm test           # Jest
```

## Architecture

```
app/
  api/               Next.js route handlers
    auth/            server-side token fetch (keeps API_KEY off the client)
    lead/
      create-or-update/   optional proxy for lead creation
  components/
    booking/         booking flow — `SinglePageBookingFlow` is the main entry point
    ui/              Radix-based shared UI primitives
  contexts/          BookingContext manages form + pricing state
  hooks/             Data-fetching and utility hooks
  lib/
    config/          env helpers (`api-url.ts` is the single URL source of truth)
  services/
    api/             MaidCentral API client modules
      fetch-utils.ts        fetch wrapper with timeout + bearer auth
      booking-data.ts       scope groups, questions, availability, price calculation
      lead.ts               lead + quote creation
      bookquote.ts          booking confirmation
      http-client.ts        axios client (used by cache-manager consumers)
      cache-manager.ts      in-memory response cache
  types/             shared TypeScript types
```

## Conventions

- Import alias `@/*` maps to repo root — use `@/app/...` for app-relative imports.
- TypeScript strict mode is on. Annotate return types on exported functions.
- Components live in `app/components/` and use PascalCase filenames.
- Tailwind utilities only; no CSS modules. Class order follows Radix + shadcn patterns.
- Every API base URL reads from `app/lib/config/api-url.ts`. Do not re-introduce
  scattered `process.env.NEXT_PUBLIC_API_BASE_URL || 'https://…'` fallbacks.

## Environment variables

See `.env.example`. The important ones:

- `API_USERNAME` / `API_KEY` — server-only credentials used by `app/api/auth/route.ts`.
- `NEXT_PUBLIC_API_BASE_URL` — MaidCentral API host (required; the app throws at
  startup if unset).

## When editing this codebase

- Keep logs intentional. Don't re-introduce debug `console.log` or emoji-laden
  performance instrumentation — the code was recently stripped of it.
- When a change affects auth, lead creation, quote creation, or booking, note
  whether server-side (`app/api/...`) or client-side (`app/services/api/...`)
  code owns the change; they have different concerns (credential handling vs.
  UI state).
- Payment tokenization uses CardConnect — partners on a different gateway will
  need to replace `CardConnectTokenizer.tsx` and `app/config/cardconnect.ts`.
