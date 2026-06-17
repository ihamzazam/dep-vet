/**
 * Server-side Pendo Track Event helper.
 *
 * Sends track events to the Pendo data API via HTTP POST.
 * Fire-and-forget: never blocks the caller or breaks application flow.
 */

const PENDO_TRACK_URL = "https://data.pendo.io/data/track";
const PENDO_INTEGRATION_KEY = "bdb7d4ab-8762-493c-88f9-36a87d75e47d";

export function pendoTrack(
  event: string,
  properties: Record<string, string | number | boolean> = {},
): void {
  fetch(PENDO_TRACK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pendo-integration-key": PENDO_INTEGRATION_KEY,
    },
    body: JSON.stringify({
      type: "track",
      event,
      visitorId: "system",
      accountId: "system",
      timestamp: Date.now(),
      properties,
    }),
  }).catch(() => {
    // Tracking failures must not break application flow
  });
}
