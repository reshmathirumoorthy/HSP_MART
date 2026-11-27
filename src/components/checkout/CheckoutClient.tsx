"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { placeOnlineOrderAction } from "@/app/checkout/actions";
import { useCart } from "@/context/CartContext";
import {
  INITIAL_CHECKOUT_DATA,
  createDemoAttemptId,
  createDemoOrderReference,
  countCheckoutErrors,
  createEmptyErrors,
  demoCartSignature,
  firstErrorFieldId,
  firstErrorStep,
  hasCheckoutErrors,
  readDemoCheckoutAttempt,
  readDemoCheckoutSnapshot,
  validateCheckout,
  writeDemoCheckoutAttempt,
  type CheckoutData,
  type CheckoutFieldErrors,
  type CheckoutStep,
  type DemoOrderSnapshot,
  type PaymentMethod as PaymentMethodId,
} from "@/lib/checkout";
import { validateResolvedCart } from "@/lib/cartValidation";
import { CheckoutProgress } from "@/components/checkout/CheckoutProgress";
import { CustomerForm } from "@/components/checkout/CustomerForm";
import { AddressForm } from "@/components/checkout/AddressForm";
import { SavedAddressPicker } from "@/components/checkout/SavedAddressPicker";
import { PaymentMethod } from "@/components/checkout/PaymentMethod";
import { OrderReview } from "@/components/checkout/OrderReview";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { OrderSuccess } from "@/components/checkout/OrderSuccess";
import { formatPrice } from "@/data/products";
import { isProductCustomizable } from "@/lib/productModel";
import styles from "./CheckoutClient.module.css";

const SHIPPING_AMOUNT = 0;

/** Logos embedded as data URLs are too large to post; artwork is uploaded on the order page. */
function stripInlineMedia(value: unknown): unknown {
  if (typeof value === "string") return value.startsWith("data:") ? "[uploaded separately]" : value;
  if (Array.isArray(value)) return value.map(stripInlineMedia);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripInlineMedia(v)]));
  return value;
}

function scrollToStep(step: CheckoutStep) {
  const id =
    step === "customer"
      ? "checkout-customer"
      : step === "delivery"
        ? "checkout-delivery"
        : step === "payment"
          ? "checkout-payment"
          : "checkout-review";

  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const focusable = el.querySelector<HTMLElement>(
      "input, select, button, textarea",
    );
    focusable?.focus({ preventScroll: true });
  }
}

function focusFirstInvalidField(errors: CheckoutFieldErrors) {
  const fieldId = firstErrorFieldId(errors);
  if (!fieldId) {
    scrollToStep(firstErrorStep(errors));
    return;
  }

  const el = document.getElementById(fieldId);
  if (!el) {
    scrollToStep(firstErrorStep(errors));
    return;
  }

  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if ("focus" in el && typeof el.focus === "function") {
    el.focus({ preventScroll: true });
  } else {
    const nested = el.querySelector<HTMLElement>(
      'input[type="radio"], input, select, button, textarea',
    );
    nested?.focus({ preventScroll: true });
  }
}

export function CheckoutClient() {
  const {
    resolvedItems,
    cartCount,
    cartSubtotal,
    hydrated,
    clearCart,
  } = useCart();
  const router = useRouter();

  const [data, setData] = useState<CheckoutData>(INITIAL_CHECKOUT_DATA);
  const [errors, setErrors] = useState<CheckoutFieldErrors>(createEmptyErrors());
  const [step, setStep] = useState<CheckoutStep>("customer");
  const [processing, setProcessing] = useState(false);
  const [stockAlert, setStockAlert] = useState("");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<
    string | null
  >(null);
  const [completedOrder, setCompletedOrder] =
    useState<DemoOrderSnapshot | null>(null);
  const demoTimersRef = useRef<number[]>([]);
  const placingRef = useRef(false);

  const shipping = SHIPPING_AMOUNT;
  const total = cartSubtotal + shipping;
  const cartSignature = demoCartSignature(resolvedItems, cartSubtotal);
  const attempt = hydrated ? readDemoCheckoutAttempt() : null;
  const persistedOrder = hydrated ? readDemoCheckoutSnapshot() : null;
  const completedForEmptyCart =
    cartCount === 0 &&
    attempt?.status === "complete" &&
    persistedOrder?.reference === attempt.reference;
  const visibleOrder = completedOrder ?? (completedForEmptyCart ? persistedOrder : null);
  const interruptedAttempt =
    !visibleOrder &&
    attempt?.status === "pending" &&
    cartCount > 0 &&
    attempt.cartSignature === cartSignature
      ? attempt
      : null;

  useEffect(() => {
    return () => {
      for (const timer of demoTimersRef.current) {
        window.clearTimeout(timer);
      }
      demoTimersRef.current = [];
    };
  }, []);

  const hasCustomizable = useMemo(
    () => resolvedItems.some((item) => isProductCustomizable(item.product)),
    [resolvedItems],
  );

  const cartValidation = useMemo(
    () => validateResolvedCart(resolvedItems),
    [resolvedItems],
  );
  const hasUnavailable = !cartValidation.canCheckout && cartCount > 0;
  const formErrorCount = countCheckoutErrors(errors);
  const hasFormErrors = formErrorCount > 0;

  const handlePlaceOrder = () => {
    if (placingRef.current || processing || !hydrated) return;

    if (cartCount === 0) return;

    if (!cartValidation.canCheckout) {
      setStockAlert(
        cartValidation.issues.find((issue) => issue.severity === "error")
          ?.message ??
          "One or more items need attention. Return to your cart to review.",
      );
      return;
    }

    const nextErrors = validateCheckout(data);
    setErrors(nextErrors);

    if (hasCheckoutErrors(nextErrors)) {
      const target = firstErrorStep(nextErrors);
      setStep(target);
      window.setTimeout(() => focusFirstInvalidField(nextErrors), 40);
      return;
    }

    if (!data.paymentMethod) return;

    const existingAttempt = readDemoCheckoutAttempt();
    const reserved =
      existingAttempt?.status === "pending" &&
      existingAttempt.cartSignature === cartSignature
        ? existingAttempt
        : {
            attemptId: createDemoAttemptId(),
            reference: createDemoOrderReference(),
            cartSignature,
            status: "pending" as const,
          };
    writeDemoCheckoutAttempt(reserved);

    placingRef.current = true;
    setProcessing(true);
    setStockAlert("");
    setStep("review");

    // Real order: the server re-prices from the catalogue database and opens a Razorpay payment.
    void placeOnlineOrderAction({
      clientRef: reserved.attemptId,
      customer: {
        fullName: data.customer.fullName.trim(),
        email: data.customer.email.trim(),
        phone: data.customer.phone.trim(),
      },
      address: {
        line1: data.address.line1.trim(),
        line2: data.address.line2.trim(),
        city: data.address.city.trim(),
        state: data.address.state.trim(),
        pincode: data.address.pincode.trim(),
      },
      items: resolvedItems.map((item) =>
        // A built hamper sends its contents; the backend re-checks the fit and prices each product.
        item.product.packingKind === "hamper_box" && item.customization?.contents?.length
          ? { productId: item.productId, quantity: item.quantity, hamper: { contents: item.customization.contents } }
          : {
              productId: item.productId,
              quantity: item.quantity,
              personalisation: item.customization ? stripInlineMedia(item.customization) : undefined,
            },
      ),
    })
      .then((result) => {
        if (!result.ok) {
          placingRef.current = false;
          setProcessing(false);
          if (result.needLogin) {
            router.push(`/login?next=${encodeURIComponent("/checkout")}`);
            return;
          }
          setStockAlert(result.error);
          return;
        }
        writeDemoCheckoutAttempt({ ...reserved, status: "complete" });
        clearCart();
        router.push(`/my/orders/${result.orderNumber}?pay=1`);
      })
      .catch(() => {
        placingRef.current = false;
        setProcessing(false);
        setStockAlert("We couldn't place your order. Please try again — you won't be charged twice.");
      });
  };

  if (!hydrated) {
    return (
      <div className={styles.page} data-nav-surface="light">
        <div className={`shell ${styles.inner}`}>
          <p className={styles.loading}>Preparing checkout…</p>
        </div>
      </div>
    );
  }

  if (visibleOrder) {
    return (
      <div className={styles.page} data-nav-surface="light">
        <div className={`shell ${styles.inner}`}>
          <OrderSuccess order={visibleOrder} />
        </div>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className={styles.page} data-nav-surface="light">
        <div className={`shell ${styles.inner}`}>
          <div className={styles.empty}>
            <p className={styles.label}>Checkout</p>
            <h1 className={styles.emptyTitle}>Your cart is empty</h1>
            <p className={styles.emptyCopy}>
              Add something to your cart before continuing to checkout.
            </p>
            <Link href="/products" className="btn btn--dark">
              Back to products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} data-nav-surface="light">
      <div className={`shell ${styles.inner}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Checkout</h1>
          <p className={styles.demoBanner} role="status">
            Prices exclude GST. GST and delivery are calculated on the next
            screen, where you pay securely through Razorpay.
          </p>
          {interruptedAttempt ? (
            <p className={styles.demoBanner} role="status">
              Your last attempt didn&apos;t finish. Placing the order again
              continues the same order — you won&apos;t be charged twice.
            </p>
          ) : null}
          <p className={styles.copy}>
            Complete your details to finish this order walkthrough.
          </p>
          <CheckoutProgress current={step} />
          {hasFormErrors ? (
            <div
              id="checkout-error-summary"
              className={styles.errorSummary}
              role="alert"
              aria-live="assertive"
            >
              {formErrorCount === 1
                ? "1 field needs attention before this order can continue."
                : `${formErrorCount} fields need attention before this order can continue.`}{" "}
              Review the highlighted fields below.
            </div>
          ) : null}
        </header>

        <div className={styles.layout}>
          <div className={styles.formColumn}>
            <CustomerForm
              value={data.customer}
              errors={errors}
              onChange={(customer) => {
                setData((prev) => ({ ...prev, customer }));
                setStep("customer");
                setErrors((prev) => ({
                  ...prev,
                  fullName: undefined,
                  email: undefined,
                  phone: undefined,
                }));
              }}
            />

            <AddressForm
              value={data.address}
              errors={errors}
              beforeFields={
                <SavedAddressPicker
                  selectedId={selectedSavedAddressId}
                  currentAddress={data.address}
                  onSelect={(address, savedId) => {
                    setSelectedSavedAddressId(savedId);
                    setData((prev) => ({ ...prev, address }));
                    setStep("delivery");
                    setErrors((prev) => ({
                      ...prev,
                      line1: undefined,
                      city: undefined,
                      state: undefined,
                      pincode: undefined,
                      country: undefined,
                    }));
                  }}
                  onUseManual={() => {
                    setSelectedSavedAddressId(null);
                    setStep("delivery");
                    window.setTimeout(() => {
                      document.getElementById("checkout-line1")?.focus();
                    }, 0);
                  }}
                />
              }
              onChange={(address) => {
                setSelectedSavedAddressId(null);
                setData((prev) => ({ ...prev, address }));
                setStep("delivery");
                setErrors((prev) => ({
                  ...prev,
                  line1: undefined,
                  city: undefined,
                  state: undefined,
                  pincode: undefined,
                  country: undefined,
                }));
              }}
            />

            <PaymentMethod
              value={data.paymentMethod}
              error={errors.paymentMethod}
              onChange={(paymentMethod: PaymentMethodId) => {
                setData((prev) => ({ ...prev, paymentMethod }));
                setStep("payment");
                setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
              }}
            />

            <OrderReview
              data={data}
              items={resolvedItems}
              subtotal={cartSubtotal}
              shipping={shipping}
              total={total}
              onEdit={(target) => {
                setStep(target);
                scrollToStep(target);
              }}
            />
          </div>

          <div className={styles.summaryColumn}>
            <CheckoutSummary
              items={resolvedItems}
              subtotal={cartSubtotal}
              shipping={shipping}
              total={total}
              processing={processing}
              placeDisabled={cartCount === 0 || !cartValidation.canCheckout}
              stockAlert={
                stockAlert ||
                (hasUnavailable
                  ? cartValidation.issues.find(
                      (issue) => issue.severity === "error",
                    )?.message ??
                    "One or more items need attention. Return to your cart to review."
                  : undefined)
              }
              hasCustomizable={hasCustomizable}
              formErrorSummaryId={
                hasFormErrors ? "checkout-error-summary" : undefined
              }
              onPlaceOrder={handlePlaceOrder}
            />
          </div>
        </div>

        <div className={styles.mobileBar} data-sticky-purchase>
          <div className={styles.mobileBarMeta}>
            <span>Merchandise total</span>
            <strong>{formatPrice(cartSubtotal)}</strong>
            {(stockAlert || hasUnavailable) &&
            (cartCount === 0 || !cartValidation.canCheckout) ? (
              <p
                id="checkout-mobile-blocked"
                className={styles.mobileBlocked}
                role="status"
              >
                {stockAlert ||
                  cartValidation.issues.find(
                    (issue) => issue.severity === "error",
                  )?.message ||
                  "One or more items need attention before placing this order."}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={`btn btn--dark ${styles.mobilePlace}`}
            onClick={handlePlaceOrder}
            disabled={
              processing || cartCount === 0 || !cartValidation.canCheckout
            }
            aria-describedby={
              [
                cartCount === 0 || !cartValidation.canCheckout
                  ? "checkout-mobile-blocked"
                  : null,
                hasFormErrors ? "checkout-error-summary" : null,
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
          >
            {processing ? "Processing…" : "Place order & pay"}
          </button>
        </div>
      </div>
    </div>
  );
}
