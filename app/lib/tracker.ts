/**
 * Booking-widget telemetry hook — events partners can forward to their own
 * analytics pipeline. See docs/online-booking-form/04-react-build-spec.md §12.
 *
 * Partners opt in by assigning a handler on the global window:
 *
 *   window.mcBookingTrack = (event) => {
 *     // forward to Segment / GA / Rudderstack / whatever
 *   }
 *
 * If no handler is set, `track()` is a no-op. Analytics errors are swallowed
 * so a broken handler can never break the booking form.
 */

export type BookingTrackEvent =
  | { type: "booking_started" }
  | { type: "booking_step_completed"; step: number; durationMs: number }
  | {
      type: "booking_price_recalculated"
      firstJobTotal: number
      recurringTotal: number
      totalHours: number
    }
  | { type: "booking_completed"; quoteId: string; leadId: number }
  | { type: "booking_error"; step: number; message: string }

declare global {
  interface Window {
    mcBookingTrack?: (event: BookingTrackEvent) => void
  }
}

export function track(event: BookingTrackEvent): void {
  if (typeof window === "undefined") return
  const handler = window.mcBookingTrack
  if (!handler) return
  try {
    handler(event)
  } catch {
    // Never let a partner's analytics throw break the flow.
  }
}
