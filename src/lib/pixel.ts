// Pixel Analytics tracking utility for ScalaNinja checkouts

const PIXEL_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/pixel-event`;

function getSessionId(): string {
  let sid = sessionStorage.getItem("sn_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("sn_session_id", sid);
  }
  return sid;
}

function getParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

export function trackPixelEvent(
  storeId: string,
  checkoutId: string,
  eventType: string,
  metadata: Record<string, any> = {}
) {
  try {
    fetch(PIXEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        checkout_id: checkoutId,
        event_type: eventType,
        session_id: getSessionId(),
        referrer: document.referrer,
        utm_source: getParam("utm_source"),
        utm_medium: getParam("utm_medium"),
        utm_campaign: getParam("utm_campaign"),
        metadata,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silent fail — never block checkout UX
  }
}
