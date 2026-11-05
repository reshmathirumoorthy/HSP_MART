import type { Product } from "@/data/products";
import { isInStock } from "@/lib/productAvailability";
import { getProductById } from "@/lib/products";
import { getCustomizationIdentityKey } from "@/lib/customization/identity";
import type {
  CartCustomization,
  CartHamperContent,
  CartZoneCustomization,
  CustomizationColorOption,
  CustomizationFontOption,
  CustomizationMediaType,
  CustomizationPlacementOption,
  TextOrientation,
} from "@/types/customization";

export { getProductById };
export { getCustomizationIdentityKey } from "@/lib/customization/identity";

export const CART_STORAGE_KEY = "hsp-mart-cart";

export type CartLine = {
  productId: string;
  quantity: number;
  customization?: CartCustomization;
};

export type ResolvedCartItem = {
  lineKey: string;
  productId: string;
  quantity: number;
  product: Product;
  lineTotal: number;
  unavailable: boolean;
  customization?: CartCustomization;
};

export function getCartLineKey(
  line: Pick<CartLine, "productId" | "customization">,
): string {
  const customization = normalizeCustomization(line.customization);
  if (!customization) return line.productId;
  return `${line.productId}__cust__${getCustomizationIdentityKey(customization)}`;
}

function asFont(value: unknown): CustomizationFontOption {
  return value === "classic" ||
    value === "modern" ||
    value === "bold" ||
    value === "handwritten"
    ? value
    : "classic";
}

function asColor(value: unknown): CustomizationColorOption {
  return value === "black" ||
    value === "white" ||
    value === "green" ||
    value === "gold"
    ? value
    : "black";
}

function asPlacement(value: unknown): CustomizationPlacementOption {
  return value === "front" ||
    value === "center" ||
    value === "side" ||
    value === "cover"
    ? value
    : "center";
}

function asMediaType(value: unknown): CustomizationMediaType {
  return value === "logo" || value === "image" || value === "text"
    ? value
    : "text";
}

function asTextOrientation(value: unknown): TextOrientation {
  if (
    value === "vertical" ||
    value === "vertical-reverse" ||
    value === "horizontal-reverse"
  ) {
    return value;
  }
  return "horizontal";
}

function normalizeZoneCustomizations(
  value: unknown,
): CartZoneCustomization[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const zones: CartZoneCustomization[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const zoneId =
      typeof record.zoneId === "string" && record.zoneId.trim()
        ? record.zoneId.trim()
        : null;
    if (!zoneId) continue;
    const zoneLabel =
      typeof record.zoneLabel === "string" && record.zoneLabel.trim()
        ? record.zoneLabel.trim()
        : zoneId;
    const type = asMediaType(record.type);
    const objectId =
      typeof record.objectId === "string" && record.objectId.trim()
        ? record.objectId.trim()
        : undefined;
    const base: CartZoneCustomization = {
      zoneId,
      zoneLabel,
      objectId,
      type,
      x:
        typeof record.x === "number" && Number.isFinite(record.x)
          ? record.x
          : undefined,
      y:
        typeof record.y === "number" && Number.isFinite(record.y)
          ? record.y
          : undefined,
      scale:
        typeof record.scale === "number" && Number.isFinite(record.scale)
          ? record.scale
          : undefined,
      rotation:
        typeof record.rotation === "number" && Number.isFinite(record.rotation)
          ? record.rotation
          : undefined,
    };

    if (type === "logo" || type === "image") {
      const mediaDataUrl =
        typeof record.mediaDataUrl === "string" &&
        record.mediaDataUrl.startsWith("data:image/")
          ? record.mediaDataUrl
          : undefined;
      const mediaName =
        typeof record.mediaName === "string"
          ? record.mediaName.slice(0, 120)
          : undefined;
      if (!mediaDataUrl && !mediaName) continue;
      zones.push({
        ...base,
        text: mediaName || type,
        mediaName,
        mediaDataUrl,
      });
      continue;
    }

    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) continue;
    zones.push({
      ...base,
      type: "text",
      text: text.slice(0, 40),
      font: asFont(record.font),
      color: asColor(record.color),
      colorValue:
        typeof record.colorValue === "string" ? record.colorValue : undefined,
      textOrientation: asTextOrientation(record.textOrientation),
    });
  }
  return zones.length > 0 ? zones : undefined;
}

function normalizeContents(value: unknown): CartHamperContent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: CartHamperContent[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const productId =
      typeof record.productId === "string" ? record.productId : null;
    if (!productId || !getProductById(productId)) continue;
    const quantity =
      typeof record.quantity === "number" && Number.isFinite(record.quantity)
        ? Math.min(99, Math.max(1, Math.floor(record.quantity)))
        : 1;
    items.push({ productId, quantity });
  }
  return items.length > 0 ? items : undefined;
}

export function normalizeCustomization(
  value: unknown,
): CartCustomization | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;

  const contents = normalizeContents(record.contents);
  const isHamper = record.hamper === true || Boolean(contents?.length);

  const type = asMediaType(record.type);
  const variantId =
    typeof record.variantId === "string" && record.variantId.trim()
      ? record.variantId.trim()
      : undefined;
  const variantLabel =
    typeof record.variantLabel === "string" && record.variantLabel.trim()
      ? record.variantLabel.trim()
      : undefined;

  const x =
    typeof record.x === "number" && Number.isFinite(record.x)
      ? record.x
      : undefined;
  const y =
    typeof record.y === "number" && Number.isFinite(record.y)
      ? record.y
      : undefined;
  const scale =
    typeof record.scale === "number" && Number.isFinite(record.scale)
      ? record.scale
      : undefined;
  const rotation =
    typeof record.rotation === "number" && Number.isFinite(record.rotation)
      ? record.rotation
      : undefined;

  const zoneCustomizations = normalizeZoneCustomizations(
    record.zoneCustomizations,
  );
  const zoneId =
    typeof record.zoneId === "string" && record.zoneId.trim()
      ? record.zoneId.trim()
      : typeof record.customizationZone === "string" &&
          record.customizationZone.trim()
        ? record.customizationZone.trim()
        : zoneCustomizations?.[0]?.zoneId;
  const zoneLabel =
    typeof record.zoneLabel === "string" && record.zoneLabel.trim()
      ? record.zoneLabel.trim()
      : zoneCustomizations?.find((z) => z.zoneId === zoneId)?.zoneLabel;

  if (type === "logo" || type === "image") {
    const mediaDataUrl =
      typeof record.mediaDataUrl === "string" &&
      record.mediaDataUrl.startsWith("data:image/")
        ? record.mediaDataUrl
        : undefined;
    const mediaName =
      typeof record.mediaName === "string"
        ? record.mediaName.slice(0, 120)
        : undefined;

    if (
      !mediaDataUrl &&
      !mediaName &&
      !isHamper &&
      !zoneCustomizations?.length
    ) {
      return undefined;
    }

    return {
      hamper: isHamper || undefined,
      contents,
      variantId,
      variantLabel,
      type,
      text: mediaName || type,
      mediaName,
      mediaDataUrl,
      x,
      y,
      scale,
      rotation,
      zoneId,
      zoneLabel,
      customizationZone: zoneId,
      zoneCustomizations,
    };
  }

  const text = typeof record.text === "string" ? record.text.trim() : "";

  // Hamper with contents only (no branding yet) is still a valid cart line.
  if (!text && isHamper && contents?.length) {
    return {
      hamper: true,
      contents,
    };
  }

  if (!text && zoneCustomizations?.length) {
    const primary =
      zoneCustomizations.find((z) => z.zoneId === zoneId) ??
      zoneCustomizations[0];
    return {
      hamper: isHamper || undefined,
      contents,
      variantId,
      variantLabel,
      type: primary.type,
      text: primary.text,
      font: primary.font,
      color: primary.color,
      colorValue: primary.colorValue,
      textOrientation: primary.textOrientation,
      mediaName: primary.mediaName,
      mediaDataUrl: primary.mediaDataUrl,
      x: primary.x,
      y: primary.y,
      scale: primary.scale,
      rotation: primary.rotation,
      zoneId: primary.zoneId,
      zoneLabel: primary.zoneLabel,
      customizationZone: primary.zoneId,
      zoneCustomizations,
    };
  }

  if (!text && variantId && !zoneCustomizations?.length && !isHamper) {
    return { variantId, variantLabel };
  }

  if (!text) return undefined;

  const font = asFont(record.font);
  const color = asColor(record.color);
  const placement = asPlacement(record.placement);
  const textOrientation = asTextOrientation(record.textOrientation);

  return {
    hamper: isHamper || undefined,
    contents,
    variantId,
    variantLabel,
    type: "text",
    text: text.slice(0, 40),
    font,
    color,
    colorValue:
      typeof record.colorValue === "string" ? record.colorValue : undefined,
    textOrientation,
    placement,
    x,
    y,
    scale,
    rotation,
    zoneId,
    zoneLabel,
    customizationZone: zoneId,
    zoneCustomizations,
  };
}

export function sanitizeCartLines(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];

  const map = new Map<string, CartLine>();

  for (const entry of lines) {
    if (!entry || typeof entry !== "object") continue;
    const productId =
      "productId" in entry && typeof entry.productId === "string"
        ? entry.productId
        : null;
    const quantity =
      "quantity" in entry && typeof entry.quantity === "number"
        ? entry.quantity
        : null;

    if (!productId || !getProductById(productId)) continue;
    if (!quantity || !Number.isFinite(quantity) || quantity < 1) continue;

    const customization = normalizeCustomization(
      "customization" in entry ? entry.customization : undefined,
    );
    const nextQty = Math.min(999, Math.floor(quantity));
    const line: CartLine = customization
      ? { productId, quantity: nextQty, customization }
      : { productId, quantity: nextQty };
    const key = getCartLineKey(line);
    const existing = map.get(key);

    if (existing) {
      map.set(key, {
        ...existing,
        quantity: Math.min(999, existing.quantity + nextQty),
      });
    } else {
      map.set(key, line);
    }
  }

  return Array.from(map.values());
}

export function readCartFromStorage(): CartLine[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeCartLines(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeCartToStorage(lines: CartLine[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Ignore quota / private mode failures (large data URLs may exceed quota).
  }
}

export function resolveCartItems(lines: CartLine[]): ResolvedCartItem[] {
  const items: ResolvedCartItem[] = [];

  for (const line of lines) {
    const product = getProductById(line.productId);
    if (!product) continue;

    const customization = line.customization
      ? {
          ...line.customization,
          variantLabel:
            line.customization.variantLabel ||
            product.customization?.variants?.find(
              (variant) => variant.id === line.customization?.variantId,
            )?.label,
        }
      : undefined;

    items.push({
      lineKey: getCartLineKey(line),
      productId: line.productId,
      quantity: line.quantity,
      product,
      lineTotal: product.price * line.quantity,
      unavailable: !isInStock(product),
      customization,
    });
  }

  return items;
}

export function getCartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function getCartSubtotal(lines: CartLine[]): number {
  return resolveCartItems(lines).reduce((sum, item) => sum + item.lineTotal, 0);
}
