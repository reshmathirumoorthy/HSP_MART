"use client";

import Link from "next/link";
import { formatPrice } from "@/data/products";
import { ProductVisual } from "@/components/ProductVisual";
import { CartQuantityControl } from "@/components/cart/CartQuantityControl";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import {
  getCartLineKey,
  getProductById,
  type CartLine,
  type ResolvedCartItem,
} from "@/lib/cart";
import {
  cartLineHasPreservedConfig,
  getCartLineImageSrc,
} from "@/lib/cartValidation";
import { saveVariant } from "@/lib/savedVariants";
import {
  customizationDetails,
  formatCustomizationSummary,
} from "@/components/customization/customization.utils";
import { formatCustomizationBrief } from "@/lib/customization/summary";
import styles from "./CartItem.module.css";

type Props = {
  item: ResolvedCartItem;
  compact?: boolean;
  onRemoved?: (line: CartLine, previousIndex: number, productName: string) => void;
  onSavedForLater?: (productName: string) => void;
  lineIndex?: number;
};

export function CartItem({
  item,
  compact = false,
  onRemoved,
  onSavedForLater,
  lineIndex = 0,
}: Props) {
  const { items, increaseQuantity, decreaseQuantity, removeFromCart } =
    useCart();
  const { addToWishlist } = useWishlist();
  const { product, quantity, lineTotal, unavailable, lineKey, customization } =
    item;

  const configured = cartLineHasPreservedConfig(customization);
  const details = customizationDetails(customization);
  const extraDetails = details.filter((line) => !/^Colou?r:/i.test(line));
  const isHamper = Boolean(customization?.contents?.length);
  const compactLabel =
    formatCustomizationBrief(customization) ||
    formatCustomizationSummary(customization);
  const imageSrc = getCartLineImageSrc(product, customization);
  const variantLabel = customization?.variantLabel;
  const colourOnly =
    Boolean(variantLabel) &&
    !customization?.text?.trim() &&
    !customization?.zoneCustomizations?.length &&
    !customization?.mediaDataUrl &&
    customization?.type !== "logo" &&
    customization?.type !== "image" &&
    !isHamper;
  const stockCap =
    typeof product.stockQuantity === "number" &&
    Number.isFinite(product.stockQuantity) &&
    product.stockQuantity > 0
      ? Math.floor(product.stockQuantity)
      : undefined;

  const cartLine: CartLine =
    items.find((line) => getCartLineKey(line) === lineKey) ?? {
      productId: item.productId,
      quantity: item.quantity,
      customization: item.customization,
    };

  const handleRemove = () => {
    onRemoved?.(cartLine, lineIndex, product.name);
    removeFromCart(lineKey);
  };

  const variantSave =
    colourOnly &&
    Boolean(customization?.variantId) &&
    Boolean(customization?.variantLabel);

  const handleSaveForLater = () => {
    if (configured && !variantSave) return;
    if (
      variantSave &&
      customization?.variantId &&
      customization.variantLabel
    ) {
      const saved = saveVariant({
        productId: product.id,
        variantId: customization.variantId,
        variantLabel: customization.variantLabel,
      });
      if (!saved) return;
    }
    const ok = addToWishlist(product.id);
    if (!ok) return;
    onSavedForLater?.(
      variantSave && customization?.variantLabel
        ? `${product.name} (${customization.variantLabel})`
        : product.name,
    );
    removeFromCart(lineKey);
  };

  return (
    <article className={`${styles.item} ${compact ? styles.compact : ""}`}>
      <Link href={`/products/${product.slug}`} className={styles.visual}>
        <ProductVisual
          product={product}
          variant="compact"
          sizes="112px"
          imageSrc={imageSrc}
          altSuffix={variantLabel ? `Colour ${variantLabel}` : undefined}
        />
      </Link>

      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.meta}>
            <p className={styles.category}>{product.category}</p>
            <Link href={`/products/${product.slug}`} className={styles.name}>
              {product.name}
            </Link>
            <p className={styles.unit}>{formatPrice(product.price)} each</p>

            {variantLabel ? (
              <p className={styles.variant}>Colour: {variantLabel}</p>
            ) : null}

            {isHamper && !compact ? (
              <div className={styles.customization}>
                <p className={styles.configLabel}>Contents</p>
                <ul className={styles.hamperList}>
                  {(customization?.contents ?? []).map((entry, contentIndex) => {
                    const contentProduct = getProductById(entry.productId);
                    return (
                      <li
                        key={`${entry.productId}-${entry.quantity}-${contentIndex}`}
                      >
                        <span className={styles.hamperThumb} aria-hidden>
                          {contentProduct ? (
                            <ProductVisual
                              product={contentProduct}
                              variant="compact"
                              sizes="28px"
                            />
                          ) : null}
                        </span>
                        <span>
                          {contentProduct?.name ?? entry.productId}
                          {entry.quantity > 1 ? ` × ${entry.quantity}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {customization?.type === "logo" ||
                customization?.type === "image" ? (
                  <p>
                    Branding:{" "}
                    {customization.type === "logo"
                      ? "Logo uploaded"
                      : "Image uploaded"}
                    {customization.mediaName
                      ? ` · ${customization.mediaName}`
                      : ""}
                  </p>
                ) : customization?.text?.trim() ? (
                  <p>Branding: Text — “{customization.text.trim()}”</p>
                ) : null}
              </div>
            ) : !isHamper && extraDetails.length > 0 && !compact ? (
              <div className={styles.customization}>
                <p className={styles.configLabel}>Customized</p>
                <ul className={styles.detailList}>
                  {extraDetails.map((line) => (
                    <li key={line}>{formatDetailLine(line)}</li>
                  ))}
                </ul>
              </div>
            ) : compact && (compactLabel || variantLabel || isHamper) ? (
              <p className={styles.customization}>
                {isHamper
                  ? "Hamper"
                  : colourOnly
                    ? `Colour · ${variantLabel}`
                    : "Customized"}
                {!colourOnly && variantLabel ? ` · ${variantLabel}` : ""}
                {compactLabel ? ` · ${compactLabel}` : ""}
              </p>
            ) : null}

            {unavailable ? (
              <p className={styles.unavailable} role="status">
                This product is currently unavailable.
              </p>
            ) : null}
          </div>
          <p className={styles.lineTotal}>{formatPrice(lineTotal)}</p>
        </div>

        <div className={styles.actions}>
          <CartQuantityControl
            value={quantity}
            productName={product.name}
            max={stockCap}
            disabled={unavailable}
            onIncrease={() => increaseQuantity(lineKey)}
            onDecrease={() => decreaseQuantity(lineKey)}
          />
          <button
            type="button"
            className={styles.remove}
            onClick={handleRemove}
            aria-label={`Remove ${product.name} from cart`}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7h16" />
              <path d="M9.5 7V4.5A1.5 1.5 0 0 1 11 3h2a1.5 1.5 0 0 1 1.5 1.5V7" />
              <path d="m6.5 7 1.2 12.2A2 2 0 0 0 9.7 21h4.6a2 2 0 0 0 2-1.8L17.5 7" />
            </svg>
            Remove
          </button>
          {!compact ? (
            configured && !variantSave ? (
              <span className={styles.saveHint}>
                Text, logo, image, and hamper details stay in the cart. Saving
                for later would keep only the product.
              </span>
            ) : (
              <button
                type="button"
                className={styles.save}
                onClick={handleSaveForLater}
                aria-label={`Save ${product.name} for later`}
              >
                Save for later
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}

function formatDetailLine(line: string): string {
  return line
    .replace(/^Customization:\s*/i, "Text: ")
    .replace(/^Branding:\s*/i, "Text: ")
    .replace(/^Text color:/i, "Colour:")
    .replace(/^Color:/i, "Colour:");
}
