import type { BookingFormData } from "@/app/types/booking"
import type { Frequency } from "@/app/services/api/booking-data"

/**
 * localStorage persistence for in-flight booking state.
 *
 * Persists the Step 1 + Step 2 inputs so a closed tab is recoverable (per
 * docs/online-booking-form/04-react-build-spec.md §6). CardConnect token +
 * expiry are intentionally excluded — card data must never hit local storage.
 * Pricing snapshots are recomputed when the visitor returns, so we skip those
 * too; they'd be stale by the time the tab reopens anyway.
 *
 * Versioned key lets us break old payloads cleanly if the shape changes.
 */

const STORAGE_KEY = "mc-booking-form-v1"
// 7 days. Longer and the saved data is stale (prices, availability); shorter
// and mid-week returners lose their in-progress form.
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface PersistedBookingState {
  savedAt: number
  formData: Pick<
    BookingFormData,
    | "selectedScopeGroup"
    | "selectedScope"
    | "selectedScopes"
    | "selectedFrequency"
    | "zipCode"
    | "validatedPostalCode"
    | "customer"
    | "payment"
    | "customerSourceId"
    | "utm"
    | "smsConsentTransactional"
    | "smsConsentMarketing"
    | "leadId"
    | "quoteId"
    | "scopeGroupId"
  >
  frequencyByScope: Record<number, Frequency>
  modsByScope: Record<number, Record<number, number>>
  questionAnswers: Record<number, string>
  currentStep: number
  selectedDate: string | null
  selectedTime: string
}

export function loadPersistedBooking(): PersistedBookingState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedBookingState
    if (!parsed.savedAt || Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function savePersistedBooking(state: Omit<PersistedBookingState, "savedAt">): void {
  if (typeof window === "undefined") return
  try {
    const payload: PersistedBookingState = { ...state, savedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage can be unavailable (private mode, quota) — silently skip.
  }
}

export function clearPersistedBooking(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
}
