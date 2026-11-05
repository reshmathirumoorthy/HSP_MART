/**
 * Phase 12D — reusable cart validation for storefront UX.
 * Frontend-only: no shipping/tax/payment authority.
 */

import type { Product } from "@/data/products";
import {
  getCartLineKey,
  getProductById,
  normalizeCustomization,
  type CartLine,
  type ResolvedCartItem,
} from "@/lib/cart";
import { isInStock } from "@/lib/productAvailability";
import type { CartCustomization } from "@/types/customization";

export type CartValidationSeverity = "error" | "warning";

export type CartValidationIssue = {
  severity: CartValidationSeverity;
  code:
    | "empty"
    | "unknown-product"
    | "invalid-quantity"
    | "unavailable"
    | "invalid-variant"
    | "malformed-customization"
    | "malformed-hamper";
  message: string;
  lineKey?: string;
  productId?: string;
};

export type CartValidationResult = {
  ok: boolean;
  canCheckout: boolean;
  issues: CartValidationIssue[];
};

/** True when a cart line carries configuration that wishlist (ID-only) cannot preserve. */
export function cartLineHasPreservedConfig(
  customization: CartCustomization | undefined,
): boolean {
  return Boolean(normalizeCustomization(customization));
}

export function getCartLineImageSrc(
  product: Product,
  customization?: CartCustomization,
): string | undefined {
  const variantId = customization?.variantId;
  if (variantId) {
    const variant = product.customization?.variants?.find(
      (entry) => entry.id === variantId,
    );
    const variantSrc = variant?.images?.[0];
    if (variantSrc) return variantSrc;
  }
  return product.images[0];
}

function validateLine(line: CartLine): CartValidationIssue[] {
  const issues: CartValidationIssue[] = [];
  const product = getProductById(line.productId);
  const lineKey = getCartLineKey(line);

  if (!product) {
    issues.push({
      severity: "error",
      code: "unknown-product",
      message: "A cart item is no longer available in the catalogue.",
      lineKey,
      productId: line.productId,
    });
    return issues;
  }

  if (
    !Number.isFinite(line.quantity) ||
    line.quantity < 1 ||
    Math.floor(line.quantity) !== line.quantity
  ) {
    issues.push({
      severity: "error",
      code: "invalid-quantity",
      message: `${product.name} has an invalid quantity.`,
      lineKey,
      productId: line.productId,
    });
  }

  if (!isInStock(product)) {
    issues.push({
      severity: "error",
      code: "unavailable",
      message: `${product.name} is currently unavailable.`,
      lineKey,
      productId: line.productId,
    });
  }

  if (line.customization !== undefined) {
    const normalized = normalizeCustomization(line.customization);
    if (!normalized) {
      issues.push({
        severity: "error",
        code: "malformed-customization",
        message: `${product.name} has an incomplete customization configuration.`,
        lineKey,
        productId: line.productId,
      });
      return issues;
    }

    if (normalized.variantId) {
      const variants = product.customization?.variants;
      if (variants?.length) {
        const match = variants.some(
          (variant) => variant.id === normalized.variantId,
        );
        if (!match) {
          issues.push({
            severity: "error",
            code: "invalid-variant",
            message: `${product.name} has an invalid colour/variant selection.`,
            lineKey,
            productId: line.productId,
          });
        }
      }
    }

    if (normalized.hamper || normalized.contents?.length) {
      if (!normalized.contents?.length) {
        issues.push({
          severity: "error",
          code: "malformed-hamper",
          message: `${product.name} is missing hamper contents.`,
          lineKey,
          productId: line.productId,
        });
      } else {
        const unknownContent = normalized.contents.some(
          (entry) => !getProductById(entry.productId),
        );
        if (unknownContent) {
          issues.push({
            severity: "error",
            code: "malformed-hamper",
            message: `${product.name} includes unavailable hamper contents.`,
            lineKey,
            productId: line.productId,
          });
        }
      }
    }
  }

  return issues;
}

export function validateCartLines(lines: CartLine[]): CartValidationResult {
  if (lines.length === 0) {
    return {
      ok: false,
      canCheckout: false,
      issues: [
        {
          severity: "warning",
          code: "empty",
          message: "Your cart is empty.",
        },
      ],
    };
  }

  const issues = lines.flatMap(validateLine);
  const hasError = issues.some((issue) => issue.severity === "error");

  return {
    ok: !hasError,
    canCheckout: !hasError,
    issues,
  };
}

export function validateResolvedCart(
  items: ResolvedCartItem[],
): CartValidationResult {
  if (items.length === 0) {
    return {
      ok: false,
      canCheckout: false,
      issues: [
        {
          severity: "warning",
          code: "empty",
          message: "Your cart is empty.",
        },
      ],
    };
  }

  const issues: CartValidationIssue[] = [];

  for (const item of items) {
    if (item.unavailable) {
      issues.push({
        severity: "error",
        code: "unavailable",
        message: `${item.product.name} is currently unavailable.`,
        lineKey: item.lineKey,
        productId: item.productId,
      });
    }

    if (item.quantity < 1) {
      issues.push({
        severity: "error",
        code: "invalid-quantity",
        message: `${item.product.name} has an invalid quantity.`,
        lineKey: item.lineKey,
        productId: item.productId,
      });
    }

    if (item.customization) {
      const normalized = normalizeCustomization(item.customization);
      if (!normalized) {
        issues.push({
          severity: "error",
          code: "malformed-customization",
          message: `${item.product.name} has an incomplete customization configuration.`,
          lineKey: item.lineKey,
          productId: item.productId,
        });
      }
    }
  }

  const hasError = issues.some((issue) => issue.severity === "error");
  return {
    ok: !hasError,
    canCheckout: !hasError,
    issues,
  };
}
