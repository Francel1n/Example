// Thin wrapper around PostHog. Never breaks the game if the script is
// blocked (adblockers) or hasn't loaded yet.

export function track(event, props = {}) {
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props);
    }
  } catch {
    /* analytics must never take the game down */
  }
}
