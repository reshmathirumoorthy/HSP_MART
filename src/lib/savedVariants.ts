import { getProductById } from "@/lib/cart";

export const SAVED_VARIANTS_STORAGE_KEY = "hsp-mart-saved-variants";

/** Colour saved beside the product-id wishlist. No files or customer details. */
export type SavedVariantRecord = {
  productId: string;
  variantId: string;
  variantLabel: string;
};

const EMPTY: SavedVariantRecord[] = [];
const CHANGE_EVENT = "hsp-mart-saved-variants-change";

let cachedSerialized = "__unset__";
let cachedRecords: SavedVariantRecord[] = EMPTY;

function emitChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeSavedVariants(onStoreChange: () => void) {
  const handle = () => onStoreChange();
  window.addEventListener("storage", handle);
  window.addEventListener(CHANGE_EVENT, handle);
  return () => {
    window.removeEventListener("storage", handle);
    window.removeEventListener(CHANGE_EVENT, handle);
  };
}

export function sanitizeSavedVariants(value: unknown): SavedVariantRecord[] {
  if (!Array.isArray(value)) return [];
  const records: SavedVariantRecord[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const productId =
      typeof record.productId === "string" ? record.productId.trim() : "";
    const variantId =
      typeof record.variantId === "string" ? record.variantId.trim() : "";
    const variantLabel =
      typeof record.variantLabel === "string" ? record.variantLabel.trim() : "";
    if (!productId || !variantId || !variantLabel) continue;
    if (!getProductById(productId)) continue;
    const key = `${productId}:${variantId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({ productId, variantId, variantLabel });
  }

  return records;
}

function readStored(): SavedVariantRecord[] {
  try {
    const raw = window.localStorage.getItem(SAVED_VARIANTS_STORAGE_KEY);
    const serialized = raw ?? "[]";
    if (serialized === cachedSerialized) return cachedRecords;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const records = sanitizeSavedVariants(parsed);
    cachedSerialized = serialized;
    cachedRecords = records.length === 0 ? EMPTY : records;
    return cachedRecords;
  } catch {
    cachedSerialized = "[]";
    cachedRecords = EMPTY;
    return EMPTY;
  }
}

function commit(next: SavedVariantRecord[]) {
  const sanitized = sanitizeSavedVariants(next);
  const serialized = JSON.stringify(sanitized);
  window.localStorage.setItem(SAVED_VARIANTS_STORAGE_KEY, serialized);
  cachedSerialized = serialized;
  cachedRecords = sanitized.length === 0 ? EMPTY : sanitized;
  emitChange();
}

export function getSavedVariantsSnapshot(): SavedVariantRecord[] {
  return readStored();
}

export function getSavedVariantsServerSnapshot(): SavedVariantRecord[] {
  return EMPTY;
}

/** @deprecated No-op — consumers gate hydration with useState instead. */
export function publishSavedVariants() {
  emitChange();
}

export function saveVariant(record: SavedVariantRecord): boolean {
  if (!getProductById(record.productId)) return false;
  const current = readStored();
  const key = `${record.productId}:${record.variantId}`;
  if (
    current.some((entry) => `${entry.productId}:${entry.variantId}` === key)
  ) {
    return true;
  }
  commit([record, ...current]);
  return true;
}

export function removeSavedVariant(productId: string, variantId: string): void {
  const current = readStored();
  commit(
    current.filter(
      (entry) =>
        entry.productId !== productId || entry.variantId !== variantId,
    ),
  );
}

export function savedVariantsForProduct(
  productId: string,
): SavedVariantRecord[] {
  return readStored().filter((entry) => entry.productId === productId);
}
