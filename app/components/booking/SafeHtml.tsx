"use client"

import React, { useMemo } from "react"
import DOMPurify from "isomorphic-dompurify"

interface SafeHtmlProps {
  /** Raw HTML string to render. Sanitized via DOMPurify before injection. */
  html: string | null | undefined
  className?: string
}

/**
 * Renders a tenant-authored HTML string (e.g. ScopeGroupDto.MarketingText)
 * via `dangerouslySetInnerHTML` after DOMPurify sanitization.
 *
 * Security model:
 * - Content originates in MaidCentral's admin UI where tenant staff author
 *   their own copy. Visitors can't inject.
 * - DOMPurify strips `<script>`, `<iframe>`, `on*` handlers, `javascript:`
 *   URLs, etc. before any HTML reaches the DOM, so a compromised admin
 *   account can't ship stored XSS to form visitors.
 * - Every anchor is rewritten to open in a new tab with
 *   `rel="noreferrer noopener"` so external links can't hijack the
 *   in-progress booking form (tabnabbing). `mailto:` / `tel:` links are
 *   left alone because target="_blank" on those is harmless.
 */

// Register the anchor rewriting hook once at module load. DOMPurify's hook
// registry is global, but we only sanitize via this helper so there's no
// collision with other sanitize calls in the app.
let hookRegistered = false
function ensureLinkHook() {
  if (hookRegistered || typeof window === "undefined") return
  DOMPurify.addHook("afterSanitizeAttributes", node => {
    if (!(node instanceof Element)) return
    if (node.tagName !== "A") return
    const href = node.getAttribute("href") || ""
    // Only force target/rel on real web links — tab behaviour doesn't apply
    // to mailto:/tel: so leave those alone.
    if (/^https?:/i.test(href)) {
      node.setAttribute("target", "_blank")
      node.setAttribute("rel", "noreferrer noopener")
    }
  })
  hookRegistered = true
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = useMemo(() => {
    if (!html) return ""
    ensureLinkHook()
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "a",
        "b",
        "br",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "i",
        "li",
        "ol",
        "p",
        "span",
        "strong",
        "u",
        "ul",
      ],
      ALLOWED_ATTR: ["href", "title", "target", "rel"],
      // Keep mailto: / tel: schemes so contact links in MarketingText work.
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
    })
  }, [html])

  if (!sanitized) return null

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
  )
}
