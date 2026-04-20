/**
 * MaidCentral API base URL — single source of truth.
 * Read from NEXT_PUBLIC_API_BASE_URL (works in both client and server code).
 * Throws at import time if unset so misconfiguration surfaces immediately.
 */
const url = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!url) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL is not set. Add it to .env.local (e.g. https://api.maidcentral.com).'
  );
}

export const API_BASE_URL = url;
