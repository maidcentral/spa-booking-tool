/**
 * Maps raw MaidCentral Lead API error messages into user-friendly text the
 * booking form can surface to visitors. See docs/online-booking-form §10 for
 * the source table. Unmapped messages fall back to a generic copy plus the
 * original text — the caller can render the original in a "details" accordion.
 */

export interface FriendlyError {
  /** The short line shown inline or at the top of a card. */
  headline: string
  /** Optional longer copy; currently mirrors the raw API message. */
  details?: string
}

const PATTERNS: Array<{ match: RegExp; headline: string }> = [
  {
    match: /Missing required questions/i,
    headline: "Please answer the required questions before continuing.",
  },
  {
    match: /Cannot create quote for this lead\.\s*Status is booked/i,
    headline: "This quote has already been booked. Start a new estimate to continue.",
  },
  {
    match: /FirstJobDate is required/i,
    headline: "Please pick a service date before booking.",
  },
  {
    match: /All address fields .* are required/i,
    headline: "Please fill in every address field.",
  },
  {
    match: /zip code is not approved/i,
    headline: "We don't serve that postal code yet.",
  },
  {
    match: /Both SMS consent checkboxes are required/i,
    headline: "Please agree to the SMS consent statements to continue.",
  },
]

export function friendlyApiError(rawMessage: string | undefined | null): FriendlyError {
  const details = rawMessage?.trim() || undefined
  if (!details) {
    return { headline: "Something went wrong. Please try again." }
  }
  for (const { match, headline } of PATTERNS) {
    if (match.test(details)) return { headline, details }
  }
  return {
    headline: "Something went wrong. Please try again.",
    details,
  }
}
