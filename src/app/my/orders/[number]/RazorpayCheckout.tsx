"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };

export function RazorpayCheckout(props: {
  keyId: string;
  providerOrderId: string;
  amountPaise: number;
  orderNumber: string;
  email: string | null;
  /** CSP nonce for this request (src/proxy.ts), so the checkout script is allowed to load. */
  nonce?: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const open = () => {
    const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
    new Razorpay({
      key: props.keyId,
      order_id: props.providerOrderId,
      amount: props.amountPaise,
      currency: "INR",
      name: "HSP Mart",
      description: `Order ${props.orderNumber}`,
      prefill: { email: props.email ?? undefined },
      theme: { color: "#015C31" },
      // The webhook is the source of truth; this just refreshes the page.
      handler: () => setTimeout(() => router.refresh(), 2000),
    }).open();
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" nonce={props.nonce} onReady={() => setReady(true)} />
      <button
        onClick={open}
        disabled={!ready}
        className="rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Open secure Razorpay checkout
      </button>
    </>
  );
}
