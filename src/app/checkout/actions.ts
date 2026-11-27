"use server";

import { api, ApiError } from "@/lib/api";

export type OnlineOrderInput = {
  clientRef: string;
  customer: { fullName: string; email: string; phone: string };
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  items: { productId: string; quantity: number; personalisation?: unknown; hamper?: { contents: { productId: string; quantity: number }[] } }[];
};

export type PlaceOrderResult = { ok: true; orderNumber: string } | { ok: false; error: string; needLogin?: boolean };

/** Storefront checkout. Prices are recomputed by the backend; the browser only sends ids and quantities. */
export async function placeOnlineOrderAction(input: OnlineOrderInput): Promise<PlaceOrderResult> {
  try {
    const r = await api.post<{ orderNumber: string }>("/checkout", input);
    return { ok: true, orderNumber: r.orderNumber };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message, needLogin: e.status === 401 };
    throw e;
  }
}
