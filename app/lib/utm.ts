import type { UtmParams } from "@/app/types/booking"

/**
 * Parse utm_* query parameters out of a URL search string (including the
 * leading "?"). Missing params are omitted so spreading the result onto an
 * API request body doesn't introduce `undefined` values.
 */
export function parseUtmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(search)
  const utm: UtmParams = {}
  const source = params.get("utm_source")
  const medium = params.get("utm_medium")
  const campaign = params.get("utm_campaign")
  const term = params.get("utm_term")
  const content = params.get("utm_content")
  if (source) utm.source = source
  if (medium) utm.medium = medium
  if (campaign) utm.campaign = campaign
  if (term) utm.term = term
  if (content) utm.content = content
  return utm
}

/**
 * Shape the internal UtmParams record into the snake_cased fields the
 * MaidCentral Lead API accepts on CreateOrUpdate / CreateOrUpdateQuote /
 * BookQuote.
 */
export function utmToApiFields(utm: UtmParams): {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
} {
  const out: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
  } = {}
  if (utm.source) out.utm_source = utm.source
  if (utm.medium) out.utm_medium = utm.medium
  if (utm.campaign) out.utm_campaign = utm.campaign
  if (utm.term) out.utm_term = utm.term
  if (utm.content) out.utm_content = utm.content
  return out
}
