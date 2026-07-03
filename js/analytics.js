// PostHog wrapper — must never break a tool if analytics is blocked.

export function track(event, props = {}) {
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props);
    }
  } catch {
    /* never let analytics take a tool down */
  }
}
