// ScalaCOD Pixel & Tracking Utilities

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

// ── Internal Pixel (ScalaNinja analytics) ──
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

// ── Facebook Pixel (client-side) ──
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export class FacebookPixel {
  private pixelId: string;
  private initialized = false;

  constructor(pixelId: string) {
    this.pixelId = pixelId;
  }

  init() {
    if (this.initialized || !this.pixelId) return;
    if (window.fbq) {
      window.fbq("init", this.pixelId);
      this.initialized = true;
      return;
    }

    const n: any = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(t);

    window.fbq("init", this.pixelId);
    this.initialized = true;
  }

  track(event: string, params?: Record<string, any>) {
    if (window.fbq) window.fbq("track", event, params);
  }

  pageView() { this.track("PageView"); }
  initiateCheckout(value: number, currency = "BRL") { this.track("InitiateCheckout", { value, currency }); }
  addPaymentInfo() { this.track("AddPaymentInfo"); }
  purchase(value: number, currency = "BRL", orderId: string) { this.track("Purchase", { value, currency, order_id: orderId }); }
  lead(value?: number) { this.track("Lead", value ? { value, currency: "BRL" } : undefined); }
}

// ── Google Ads / Analytics ──
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export class GoogleAds {
  private gtagId: string;
  private conversionId: string;
  private initialized = false;

  constructor(gtagId: string, conversionId: string = "") {
    this.gtagId = gtagId;
    this.conversionId = conversionId;
  }

  init() {
    if (this.initialized || !this.gtagId) return;

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.gtagId}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", this.gtagId);

    this.initialized = true;
  }

  trackConversion(value: number, currency = "BRL", orderId: string) {
    if (!window.gtag || !this.conversionId) return;
    window.gtag("event", "conversion", {
      send_to: `${this.gtagId}/${this.conversionId}`,
      value,
      currency,
      transaction_id: orderId,
    });
  }

  pageView() {
    if (window.gtag) window.gtag("event", "page_view");
  }
}

// ── UTM Tracking ──
export interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
  referrer?: string;
  fbclid?: string;
  gclid?: string;
}

export function captureUTM(): UTMData {
  const params = new URLSearchParams(window.location.search);

  const utm: UTMData = {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
    utm_id: params.get("utm_id") || undefined,
    referrer: document.referrer || undefined,
    fbclid: params.get("fbclid") || undefined,
    gclid: params.get("gclid") || undefined,
  };

  // Persist across pages
  sessionStorage.setItem("utm_data", JSON.stringify(utm));
  return utm;
}

export function getUTM(): UTMData {
  try {
    return JSON.parse(sessionStorage.getItem("utm_data") || "{}");
  } catch {
    return {};
  }
}

// ── Cookie helpers for FB CAPI ──
export function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : undefined;
}
