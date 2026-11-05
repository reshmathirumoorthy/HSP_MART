import { getCartLineKey } from "@/lib/cart";
import type { CartCustomization } from "@/types/customization";

export type CheckoutStep = "customer" | "delivery" | "payment" | "review";

export type PaymentMethod = "upi" | "card" | "netbanking" | "cod";

export type CustomerDetails = {
  fullName: string;
  email: string;
  phone: string;
};

export type DeliveryAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type CheckoutData = {
  customer: CustomerDetails;
  address: DeliveryAddress;
  paymentMethod: PaymentMethod | null;
};

export type CheckoutFieldErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  paymentMethod?: string;
};

export type DemoOrderSnapshot = {
  reference: string;
  customer: CustomerDetails;
  address: DeliveryAddress;
  paymentMethod: PaymentMethod;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    lineTotal: number;
    customization?: CartCustomization;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
};

export const CHECKOUT_STEPS: Array<{ id: CheckoutStep; number: string; label: string }> =
  [
    { id: "customer", number: "01", label: "Customer" },
    { id: "delivery", number: "02", label: "Delivery" },
    { id: "payment", number: "03", label: "Payment" },
    { id: "review", number: "04", label: "Review" },
  ];

export const PAYMENT_OPTIONS: Array<{
  id: PaymentMethod;
  label: string;
  description: string;
}> = [
  {
    id: "upi",
    label: "UPI",
    description: "Recorded for this demo only. No UPI payment is taken.",
  },
  {
    id: "card",
    label: "Card",
    description: "Recorded for this demo only. No card payment is taken.",
  },
  {
    id: "netbanking",
    label: "Net Banking",
    description: "Recorded for this demo only. No bank payment is taken.",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Recorded for this demo only. No delivery payment is collected.",
  },
];

export const INDIAN_STATES: string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export const INITIAL_CHECKOUT_DATA: CheckoutData = {
  customer: {
    fullName: "",
    email: "",
    phone: "",
  },
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  },
  paymentMethod: null,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createEmptyErrors(): CheckoutFieldErrors {
  return {};
}

export function validateCustomer(
  customer: CustomerDetails,
): Pick<CheckoutFieldErrors, "fullName" | "email" | "phone"> {
  const errors: Pick<CheckoutFieldErrors, "fullName" | "email" | "phone"> = {};

  if (!customer.fullName.trim()) {
    errors.fullName = "Please enter your full name.";
  }

  const email = customer.email.trim();
  if (!email) {
    errors.email = "Please enter a valid email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  const phoneDigits = customer.phone.replace(/\D/g, "");
  if (!customer.phone.trim()) {
    errors.phone = "Please enter a valid phone number.";
  } else if (phoneDigits.length < 10 || phoneDigits.length > 12) {
    errors.phone = "Please enter a valid phone number.";
  }

  return errors;
}

export function validateAddress(
  address: DeliveryAddress,
): Pick<
  CheckoutFieldErrors,
  "line1" | "city" | "state" | "pincode" | "country"
> {
  const errors: Pick<
    CheckoutFieldErrors,
    "line1" | "city" | "state" | "pincode" | "country"
  > = {};

  if (!address.line1.trim()) {
    errors.line1 = "Please enter your address.";
  }

  if (!address.city.trim()) {
    errors.city = "Please enter your city.";
  }

  if (!address.state.trim()) {
    errors.state = "Please select your state.";
  }

  const pincode = address.pincode.trim();
  if (!pincode) {
    errors.pincode = "Please enter a valid 6-digit pincode.";
  } else if (!/^\d{6}$/.test(pincode)) {
    errors.pincode = "Please enter a valid 6-digit pincode.";
  }

  if (!address.country.trim()) {
    errors.country = "Please enter your country.";
  }

  return errors;
}

export function validatePayment(
  paymentMethod: PaymentMethod | null,
): Pick<CheckoutFieldErrors, "paymentMethod"> {
  if (!paymentMethod) {
    return { paymentMethod: "Please select a payment method." };
  }
  return {};
}

export function validateCheckout(data: CheckoutData): CheckoutFieldErrors {
  return {
    ...validateCustomer(data.customer),
    ...validateAddress(data.address),
    ...validatePayment(data.paymentMethod),
  };
}

export function hasCheckoutErrors(errors: CheckoutFieldErrors): boolean {
  return Object.values(errors).some((value) => Boolean(value));
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_OPTIONS.find((option) => option.id === method)?.label ?? method;
}

const DEMO_CHECKOUT_STORAGE_KEY = "hsp-mart-demo-checkout";
const DEMO_ATTEMPT_STORAGE_KEY = "hsp-mart-demo-checkout-attempt";

export type DemoCheckoutAttemptStatus = "pending" | "complete";

/** Identity of one browser demo attempt. Contains no customer details. */
export type DemoCheckoutAttempt = {
  attemptId: string;
  reference: string;
  cartSignature: string;
  status: DemoCheckoutAttemptStatus;
};

const DEMO_REFERENCE_PATTERN = /^HSP-DEMO-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export function demoCartSignature(
  lines: Array<{
    productId: string;
    quantity: number;
    customization?: CartCustomization;
  }>,
  subtotal: number,
): string {
  const parts = lines
    .map((line) => `${getCartLineKey(line)}:${line.quantity}`)
    .sort();
  return `${subtotal}#${parts.join("|")}`;
}

function isDemoCheckoutAttempt(value: unknown): value is DemoCheckoutAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as DemoCheckoutAttempt;
  return (
    typeof attempt.attemptId === "string" &&
    attempt.attemptId.startsWith("attempt-") &&
    typeof attempt.reference === "string" &&
    DEMO_REFERENCE_PATTERN.test(attempt.reference) &&
    typeof attempt.cartSignature === "string" &&
    attempt.cartSignature.length > 0 &&
    (attempt.status === "pending" || attempt.status === "complete")
  );
}

export function readDemoCheckoutAttempt(): DemoCheckoutAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DEMO_ATTEMPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDemoCheckoutAttempt(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDemoCheckoutAttempt(attempt: DemoCheckoutAttempt): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    DEMO_ATTEMPT_STORAGE_KEY,
    JSON.stringify(attempt),
  );
}

export function clearDemoCheckoutAttempt(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DEMO_ATTEMPT_STORAGE_KEY);
}

function randomToken(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < length; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return suffix;
}

export function createDemoAttemptId(): string {
  return `attempt-${randomToken(8)}`;
}

function isDemoOrderSnapshot(value: unknown): value is DemoOrderSnapshot {
  if (!value || typeof value !== "object") return false;
  const order = value as DemoOrderSnapshot;
  return (
    typeof order.reference === "string" &&
    order.reference.startsWith("HSP-DEMO-") &&
    Array.isArray(order.items) &&
    order.items.length > 0 &&
    typeof order.subtotal === "number" &&
    typeof order.total === "number"
  );
}

/** Keeps the last demo confirmation for this tab. Not a real order record. */
export function readDemoCheckoutSnapshot(): DemoOrderSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DEMO_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDemoOrderSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDemoCheckoutSnapshot(order: DemoOrderSnapshot): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    DEMO_CHECKOUT_STORAGE_KEY,
    JSON.stringify(order),
  );
}

export function clearDemoCheckoutSnapshot(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DEMO_CHECKOUT_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_ATTEMPT_STORAGE_KEY);
}

export function createDemoOrderReference(): string {
  return `HSP-DEMO-${randomToken(6)}`;
}

export function firstErrorStep(errors: CheckoutFieldErrors): CheckoutStep {
  if (errors.fullName || errors.email || errors.phone) return "customer";
  if (
    errors.line1 ||
    errors.city ||
    errors.state ||
    errors.pincode ||
    errors.country
  ) {
    return "delivery";
  }
  if (errors.paymentMethod) return "payment";
  return "review";
}

/** DOM id of the first invalid checkout control, for focus management. */
export function firstErrorFieldId(errors: CheckoutFieldErrors): string | null {
  if (errors.fullName) return "checkout-full-name";
  if (errors.email) return "checkout-email";
  if (errors.phone) return "checkout-phone";
  if (errors.line1) return "checkout-line1";
  if (errors.city) return "checkout-city";
  if (errors.state) return "checkout-state";
  if (errors.pincode) return "checkout-pincode";
  if (errors.country) return "checkout-country";
  if (errors.paymentMethod) return "checkout-payment";
  return null;
}

export function countCheckoutErrors(errors: CheckoutFieldErrors): number {
  return Object.values(errors).filter(Boolean).length;
}
