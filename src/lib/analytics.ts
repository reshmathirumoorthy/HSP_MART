/**
 * Analytics-ready event definitions.
 * DEMO / MOCK — does not send data anywhere. Future CRM/analytics can subscribe.
 * Never include personal customer information in payloads.
 */

export type AnalyticsEventName =
  | "product_view"
  | "search"
  | "add_to_cart"
  | "customization_started"
  | "customization_changed"
  | "customization_text_changed"
  | "customization_preview_viewed"
  | "customized_product_added"
  | "customized_product_added_to_cart"
  | "bulk_quote_started"
  | "checkout_started";

export type AnalyticsPayload = {
  productId?: string;
  productSlug?: string;
  query?: string;
  quantity?: number;
  customizationTextLength?: number;
  font?: string;
  color?: string;
  placement?: string;
  path?: string;
};

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  payload?: AnalyticsPayload;
  at: string;
};

type Listener = (event: AnalyticsEvent) => void;

const listeners = new Set<Listener>();

export function subscribeAnalytics(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fire a typed frontend analytics event. No network. No PII. */
export function trackEvent(
  name: AnalyticsEventName,
  payload: AnalyticsPayload = {},
): void {
  const event: AnalyticsEvent = {
    name,
    payload,
    at: new Date().toISOString(),
  };

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Ignore subscriber failures — analytics must never break UX.
    }
  }

  if (process.env.NODE_ENV === "development") {
    // Lightweight local visibility for development only.
    console.debug("[analytics]", event.name, event.payload);
  }
}
