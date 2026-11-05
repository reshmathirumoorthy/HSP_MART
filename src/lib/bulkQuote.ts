import { getProductById } from "@/lib/cart";
import { getProductBySlug } from "@/lib/products";
import {
  validateAddress,
  validateCustomer,
  type DeliveryAddress,
  type CustomerDetails,
} from "@/lib/checkout";
import type { TextOrientation } from "@/types/customization";

export type QuoteStep = "products" | "requirements" | "customer" | "review";

export type OrderType =
  | "wholesale"
  | "corporate"
  | "office"
  | "event"
  | "custom"
  | "other";

export type CustomerType = "individual" | "business" | "reseller" | "institution";

export type PackagingPreference = "standard" | "custom" | "unsure";

export type YesNo = "yes" | "no";

export type BulkQuoteLine = {
  productId: string;
  quantity: number;
  notes: string;
  /** Optional visualizer text for customizable catalogue items. */
  customizationText?: string;
  /** Optional colour / variant for customizable catalogue items. */
  variantId?: string;
  variantLabel?: string;
  customizationType?: "text" | "logo" | "image";
  /** Defaults to horizontal when missing (backward compatible). */
  textOrientation?: TextOrientation;
  /** Physical surface / zone id when known. */
  customizationZone?: string;
  customizationZoneLabel?: string;
  /** Phase 10C — selected child product ids for composite hampers. */
  hamperContents?: string[];
};

export type DesignFileMeta = {
  name: string;
  size: number;
  type: string;
};

export type BulkQuoteRequirements = {
  orderType: OrderType | null;
  customization: YesNo;
  customizationNotes: string;
  designFile: DesignFileMeta | null;
  packaging: PackagingPreference;
  branding: YesNo;
  brandName: string;
  brandingNotes: string;
  expectedDelivery: string;
  additionalNotes: string;
};

export type QuoteCustomer = CustomerDetails & {
  customerType: CustomerType | null;
  organizationName: string;
  gstin: string;
};

export type BulkQuoteData = {
  lines: BulkQuoteLine[];
  requirements: BulkQuoteRequirements;
  customer: QuoteCustomer;
  address: DeliveryAddress;
};

export type BulkQuoteFieldErrors = {
  products?: string;
  quantities?: Record<string, string>;
  orderType?: string;
  customizationNotes?: string;
  designFile?: string;
  brandName?: string;
  customerType?: string;
  organizationName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type DemoQuoteSnapshot = {
  reference: string;
  lines: Array<{
    productId: string;
    name: string;
    quantity: number;
    notes: string;
    customizationText?: string;
    variantId?: string;
    variantLabel?: string;
    customizationType?: "text" | "logo" | "image";
    textOrientation?: TextOrientation;
    customizationZone?: string;
    customizationZoneLabel?: string;
    hamperContents?: string[];
  }>;
  totalUnits: number;
  orderType: OrderType;
  customization: YesNo;
  customizationNotes: string;
  packaging: PackagingPreference;
  branding: YesNo;
  brandName: string;
  expectedDelivery: string;
  additionalNotes: string;
  designFileName: string | null;
  customer: QuoteCustomer;
  address: DeliveryAddress;
};

export const QUOTE_STEPS: Array<{ id: QuoteStep; number: string; label: string }> =
  [
    { id: "products", number: "01", label: "Products" },
    { id: "requirements", number: "02", label: "Requirements" },
    { id: "customer", number: "03", label: "Customer" },
    { id: "review", number: "04", label: "Review" },
  ];

export const ORDER_TYPE_OPTIONS: Array<{ id: OrderType; label: string }> = [
  { id: "wholesale", label: "Wholesale / Reselling" },
  { id: "corporate", label: "Corporate purchase" },
  { id: "office", label: "Office / Institution" },
  { id: "event", label: "Event / Promotional" },
  { id: "custom", label: "Custom requirement" },
  { id: "other", label: "Other" },
];

export const CUSTOMER_TYPE_OPTIONS: Array<{ id: CustomerType; label: string }> = [
  { id: "individual", label: "Individual" },
  { id: "business", label: "Business / Organization" },
  { id: "reseller", label: "Reseller" },
  { id: "institution", label: "Institution" },
];

export const PACKAGING_OPTIONS: Array<{
  id: PackagingPreference;
  label: string;
}> = [
  { id: "standard", label: "Standard packaging" },
  { id: "custom", label: "Custom packaging" },
  { id: "unsure", label: "Not sure" },
];

export const MAX_DESIGN_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_DESIGN_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
] as const;

export const INITIAL_BULK_QUOTE: BulkQuoteData = {
  lines: [],
  requirements: {
    orderType: null,
    customization: "no",
    customizationNotes: "",
    designFile: null,
    packaging: "standard",
    branding: "no",
    brandName: "",
    brandingNotes: "",
    expectedDelivery: "",
    additionalNotes: "",
  },
  customer: {
    customerType: null,
    fullName: "",
    email: "",
    phone: "",
    organizationName: "",
    gstin: "",
  },
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  },
};

export { getProductBySlug };

export function resolveProductId(idOrSlug: string): string | null {
  if (getProductById(idOrSlug)) return idOrSlug;
  const bySlug = getProductBySlug(idOrSlug);
  return bySlug?.id ?? null;
}

export function createQuoteLine(
  productId: string,
  quantity = 1,
): BulkQuoteLine | null {
  const product = getProductById(productId);
  if (!product) return null;
  const min = product.minOrderQuantity ?? 1;
  const safeQty = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  const defaultVariant = product.customization?.variants?.[0];
  return {
    productId,
    quantity: Math.max(1, min, safeQty),
    notes: "",
    variantId: defaultVariant?.id,
    variantLabel: defaultVariant?.label,
    customizationType:
      product.hamperConfig?.brandingTypes?.[0] ??
      product.customization?.supportedTypes?.[0] ??
      "text",
    textOrientation: "horizontal",
    hamperContents: product.hamperConfig?.defaultContents
      ? [...product.hamperConfig.defaultContents]
      : undefined,
  };
}

export function getTotalUnits(lines: BulkQuoteLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function orderTypeLabel(type: OrderType): string {
  return ORDER_TYPE_OPTIONS.find((option) => option.id === type)?.label ?? type;
}

export function customerTypeLabel(type: CustomerType): string {
  return (
    CUSTOMER_TYPE_OPTIONS.find((option) => option.id === type)?.label ?? type
  );
}

export function packagingLabel(value: PackagingPreference): string {
  return (
    PACKAGING_OPTIONS.find((option) => option.id === value)?.label ?? value
  );
}

export function needsOrganization(type: CustomerType | null): boolean {
  return type === "business" || type === "reseller" || type === "institution";
}

export function validateDesignFile(file: File): string | null {
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".pdf"];
  const lower = file.name.toLowerCase();
  const hasExt = allowedExtensions.some((ext) => lower.endsWith(ext));
  const typeOk =
    ACCEPTED_DESIGN_TYPES.includes(
      file.type as (typeof ACCEPTED_DESIGN_TYPES)[number],
    ) || (file.type === "" && hasExt);

  if (!typeOk || !hasExt) {
    return "Please choose a PNG, JPG, JPEG or PDF file.";
  }

  if (file.size > MAX_DESIGN_FILE_BYTES) {
    return "File is too large. Please choose a file under 5MB.";
  }

  return null;
}

export function validateProductsStep(
  lines: BulkQuoteLine[],
): Pick<BulkQuoteFieldErrors, "products" | "quantities"> {
  const errors: Pick<BulkQuoteFieldErrors, "products" | "quantities"> = {};

  if (lines.length === 0) {
    errors.products = "At least one product is required.";
    return errors;
  }

  const quantities: Record<string, string> = {};
  for (const line of lines) {
    const product = getProductById(line.productId);
    if (!product) {
      quantities[line.productId] = "This product is no longer available.";
      continue;
    }
    const minimum = product.minOrderQuantity ?? 1;
    if (!Number.isFinite(line.quantity) || line.quantity < minimum) {
      quantities[line.productId] =
        minimum > 1
          ? `Enter at least ${minimum} units for this product.`
          : "Please enter a quantity of at least 1.";
    }
  }

  if (Object.keys(quantities).length > 0) {
    errors.quantities = quantities;
  }

  return errors;
}

export function validateRequirementsStep(
  requirements: BulkQuoteRequirements,
): Pick<
  BulkQuoteFieldErrors,
  "orderType" | "customizationNotes" | "brandName" | "designFile"
> {
  const errors: Pick<
    BulkQuoteFieldErrors,
    "orderType" | "customizationNotes" | "brandName" | "designFile"
  > = {};

  if (!requirements.orderType) {
    errors.orderType = "Please select a request type.";
  }

  if (
    requirements.customization === "yes" &&
    !requirements.customizationNotes.trim()
  ) {
    errors.customizationNotes = "Please describe your customization requirements.";
  }

  if (requirements.branding === "yes" && !requirements.brandName.trim()) {
    errors.brandName = "Please enter your brand or company name.";
  }

  return errors;
}

export function validateCustomerStep(
  customer: QuoteCustomer,
  address: DeliveryAddress,
): BulkQuoteFieldErrors {
  const errors: BulkQuoteFieldErrors = {
    ...validateCustomer(customer),
    ...validateAddress(address),
  };

  if (!customer.customerType) {
    errors.customerType = "Please tell us how you are ordering.";
  }

  if (
    needsOrganization(customer.customerType) &&
    !customer.organizationName.trim()
  ) {
    errors.organizationName = "Please enter your organization name.";
  }

  return errors;
}

export function validateBulkQuote(data: BulkQuoteData): BulkQuoteFieldErrors {
  return {
    ...validateProductsStep(data.lines),
    ...validateRequirementsStep(data.requirements),
    ...validateCustomerStep(data.customer, data.address),
  };
}

export function hasBulkQuoteErrors(errors: BulkQuoteFieldErrors): boolean {
  if (errors.quantities && Object.keys(errors.quantities).length > 0) {
    return true;
  }
  return Object.entries(errors).some(([key, value]) => {
    if (key === "quantities") return false;
    return Boolean(value);
  });
}

export function firstInvalidQuoteStep(errors: BulkQuoteFieldErrors): QuoteStep {
  if (errors.products || errors.quantities) return "products";
  if (
    errors.orderType ||
    errors.customizationNotes ||
    errors.brandName ||
    errors.designFile
  ) {
    return "requirements";
  }
  if (
    errors.customerType ||
    errors.organizationName ||
    errors.fullName ||
    errors.email ||
    errors.phone ||
    errors.line1 ||
    errors.city ||
    errors.state ||
    errors.pincode ||
    errors.country
  ) {
    return "customer";
  }
  return "review";
}

export function createQuoteReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `HSP-QUOTE-${suffix}`;
}

export function buildQuoteSnapshot(data: BulkQuoteData): DemoQuoteSnapshot | null {
  if (!data.requirements.orderType || !data.customer.customerType) return null;

  const lines = data.lines
    .map((line) => {
      const product = getProductById(line.productId);
      if (!product) return null;
      return {
        productId: line.productId,
        name: product.name,
        quantity: line.quantity,
        notes: line.notes.trim(),
        customizationText: line.customizationText?.trim() || undefined,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        customizationType: line.customizationType,
        textOrientation: ((): TextOrientation | undefined => {
          if (
            (line.customizationType ?? "text") !== "text" ||
            !line.customizationText?.trim()
          ) {
            return undefined;
          }
          if (
            line.textOrientation === "vertical" ||
            line.textOrientation === "vertical-reverse" ||
            line.textOrientation === "horizontal-reverse"
          ) {
            return line.textOrientation;
          }
          return "horizontal";
        })(),
        customizationZone: line.customizationZone,
        customizationZoneLabel: line.customizationZoneLabel,
        hamperContents: line.hamperContents?.length
          ? [...line.hamperContents]
          : undefined,
      };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  if (lines.length === 0) return null;

  return {
    reference: createQuoteReference(),
    lines,
    totalUnits: getTotalUnits(data.lines),
    orderType: data.requirements.orderType,
    customization: data.requirements.customization,
    customizationNotes: data.requirements.customizationNotes.trim(),
    packaging: data.requirements.packaging,
    branding: data.requirements.branding,
    brandName: data.requirements.brandName.trim(),
    expectedDelivery: data.requirements.expectedDelivery,
    additionalNotes: data.requirements.additionalNotes.trim(),
    designFileName: data.requirements.designFile?.name ?? null,
    customer: {
      ...data.customer,
      fullName: data.customer.fullName.trim(),
      email: data.customer.email.trim(),
      phone: data.customer.phone.trim(),
      organizationName: data.customer.organizationName.trim(),
      gstin: data.customer.gstin.trim(),
    },
    address: {
      ...data.address,
      line1: data.address.line1.trim(),
      line2: data.address.line2.trim(),
      city: data.address.city.trim(),
      state: data.address.state.trim(),
      pincode: data.address.pincode.trim(),
      country: data.address.country.trim(),
    },
  };
}
