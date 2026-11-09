"use client";

import { isInStock } from "@/lib/productAvailability";
import { isProductCustomizable } from "@/lib/productModel";
import { getProductById } from "@/lib/cart";
import { ProductVisual } from "@/components/ProductVisual";
import type { BulkQuoteLine } from "@/lib/bulkQuote";
import type { TextOrientation } from "@/types/customization";
import { TEXT_ORIENTATION_OPTIONS } from "@/components/customization/customization.utils";
import styles from "./QuoteProductList.module.css";

type Props = {
  lines: BulkQuoteLine[];
  quantityErrors?: Record<string, string>;
  productsError?: string;
  onChangeQuantity: (productId: string, quantity: number) => void;
  onChangeNotes: (productId: string, notes: string) => void;
  onChangeCustomizationText: (productId: string, value: string) => void;
  onChangeVariant: (productId: string, variantId: string) => void;
  onChangeCustomizationType: (
    productId: string,
    customizationType: "text" | "logo" | "image",
  ) => void;
  onChangeTextOrientation: (
    productId: string,
    textOrientation: TextOrientation,
  ) => void;
  onToggleHamperContent: (productId: string, childProductId: string) => void;
  onRemove: (productId: string) => void;
  onAddProduct: () => void;
};

export function QuoteProductList({
  lines,
  quantityErrors,
  productsError,
  onChangeQuantity,
  onChangeNotes,
  onChangeCustomizationText,
  onChangeVariant,
  onChangeCustomizationType,
  onChangeTextOrientation,
  onToggleHamperContent,
  onRemove,
  onAddProduct,
}: Props) {
  return (
    <section className={styles.sectionWrap} aria-labelledby="quote-products-heading">
      <div>
        <h2 id="quote-products-heading" className={styles.heading}>
          Products for your request
        </h2>
        <p className={styles.lead}>
          Select the products and quantities you need. Pricing will be discussed
          after review — no instant quote is shown here.
        </p>
      </div>

      {lines.length === 0 ? (
        <div className={styles.empty}>
          <p>No products selected yet. Add at least one product to continue.</p>
          <button
            type="button"
            className={`btn btn--dark ${styles.addBtn}`}
            onClick={onAddProduct}
          >
            + Add a product
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {lines.map((line) => {
            const product = getProductById(line.productId);
            if (!product) return null;
            const qtyError = quantityErrors?.[line.productId];
            const minimum = product.minOrderQuantity ?? 1;

            return (
              <li key={line.productId} className={styles.item}>
                <div className={styles.visual}>
                  <ProductVisual
                    product={product}
                    variant="compact"
                    sizes="80px"
                  />
                </div>
                <div className={styles.body}>
                  <div className={styles.top}>
                    <div className={styles.meta}>
                      <p className={styles.category}>{product.category}</p>
                      <p className={styles.name}>{product.name}</p>
                      <div className={styles.badges}>
                        {product.bulkAvailable ? <span>Bulk available</span> : null}
                        {isProductCustomizable(product) ? (
                          <span>Customization available</span>
                        ) : null}
                        {!isInStock(product) ? <span>Currently unavailable</span> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => onRemove(line.productId)}
                      aria-label={`Remove ${product.name}`}
                    >
                      Remove
                    </button>
                  </div>

                  <div className={styles.qtyRow}>
                    <label
                      className={styles.qtyLabel}
                      htmlFor={`qty-${line.productId}`}
                    >
                      Quantity required
                    </label>
                    <div className={styles.qtyControls}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        aria-label={`Decrease quantity of ${product.name}`}
                        onClick={() =>
                          onChangeQuantity(
                            line.productId,
                            Math.max(minimum, line.quantity - 1),
                          )
                        }
                        disabled={line.quantity <= minimum}
                      >
                        −
                      </button>
                      <input
                        id={`qty-${line.productId}`}
                        className={styles.qtyInput}
                        type="number"
                        inputMode="numeric"
                        min={minimum}
                        value={line.quantity}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          onChangeQuantity(
                            line.productId,
                            Number.isFinite(next)
                              ? Math.max(minimum, Math.floor(next))
                              : minimum,
                          );
                        }}
                        aria-invalid={Boolean(qtyError)}
                        aria-describedby={
                          qtyError ? `qty-error-${line.productId}` : undefined
                        }
                      />
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        aria-label={`Increase quantity of ${product.name}`}
                        onClick={() =>
                          onChangeQuantity(line.productId, line.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    {minimum > 1 ? (
                      <p className={styles.qtyLabel} id={`qty-min-${line.productId}`}>
                        Minimum {minimum} units
                      </p>
                    ) : null}
                    {qtyError ? (
                      <p
                        id={`qty-error-${line.productId}`}
                        className={styles.error}
                        role="alert"
                      >
                        {qtyError}
                      </p>
                    ) : null}
                  </div>

                  {product.hamperConfig?.enabled ? (
                    <div className={styles.notes}>
                      <p>
                        Hamper contents ({line.hamperContents?.length ?? 0} /{" "}
                        {product.hamperConfig.slots})
                      </p>
                      <div className={styles.hamperOptions}>
                        {product.hamperConfig.availableProducts.map((entry) => {
                          const child = getProductById(entry.productId);
                          if (!child) return null;
                          const checked = Boolean(
                            line.hamperContents?.includes(child.id),
                          );
                          return (
                            <label
                              key={child.id}
                              className={styles.hamperOption}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={
                                  !checked &&
                                  (line.hamperContents?.length ?? 0) >=
                                    product.hamperConfig!.slots
                                }
                                onChange={() =>
                                  onToggleHamperContent(
                                    line.productId,
                                    child.id,
                                  )
                                }
                              />
                              <span>{child.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {product.customization?.enabled ||
                  product.hamperConfig?.enabled ? (
                    <>
                      {product.customization?.variants?.length ? (
                        <div className={styles.notes}>
                          <label htmlFor={`variant-${line.productId}`}>
                            Color / variant
                          </label>
                          <select
                            id={`variant-${line.productId}`}
                            value={line.variantId ?? ""}
                            onChange={(event) =>
                              onChangeVariant(line.productId, event.target.value)
                            }
                          >
                            {product.customization?.variants?.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {((
                        product.hamperConfig?.brandingTypes ??
                        product.customization?.supportedTypes
                      )?.length ?? 0) > 1 ? (
                        <div className={styles.notes}>
                          <label htmlFor={`cust-type-${line.productId}`}>
                            Branding type
                          </label>
                          <select
                            id={`cust-type-${line.productId}`}
                            value={line.customizationType ?? "text"}
                            onChange={(event) =>
                              onChangeCustomizationType(
                                line.productId,
                                event.target.value as "text" | "logo" | "image",
                              )
                            }
                          >
                            {(
                              product.hamperConfig?.brandingTypes ??
                              product.customization?.supportedTypes ??
                              ["text"]
                            ).map((type) => (
                              <option key={type} value={type}>
                                {type === "text"
                                  ? "Text"
                                  : type === "logo"
                                    ? "Logo"
                                    : "Image"}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {(line.customizationType ?? "text") === "text" ? (
                        <>
                          <div className={styles.notes}>
                            <label htmlFor={`custom-text-${line.productId}`}>
                              Branding text{" "}
                              <span style={{ color: "var(--text-muted)" }}>
                                (optional)
                              </span>
                            </label>
                            <input
                              id={`custom-text-${line.productId}`}
                              type="text"
                              placeholder='e.g. "RESHMA"'
                              maxLength={
                                product.customization?.preview.maxLength ?? 20
                              }
                              value={line.customizationText ?? ""}
                              onChange={(event) =>
                                onChangeCustomizationText(
                                  line.productId,
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className={styles.notes}>
                            <p
                              className={styles.orientLabel}
                              id={`orient-${line.productId}-label`}
                            >
                              Text direction
                            </p>
                            <div
                              className={styles.orientRow}
                              role="group"
                              aria-labelledby={`orient-${line.productId}-label`}
                            >
                              {TEXT_ORIENTATION_OPTIONS.map((option) => {
                                const selected =
                                  (line.textOrientation ?? "horizontal") ===
                                  option.id;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    className={`${styles.orientChip} ${
                                      selected ? styles.orientChipActive : ""
                                    }`}
                                    aria-label={option.ariaLabel}
                                    aria-pressed={selected}
                                    onClick={() =>
                                      onChangeTextOrientation(
                                        line.productId,
                                        option.id as TextOrientation,
                                      )
                                    }
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className={styles.notes}>
                          <p className={styles.helperNote}>
                            {(line.customizationType ?? "logo") === "logo"
                              ? "Company logo"
                              : "Custom image"}{" "}
                            — artwork can be attached in the next step.
                          </p>
                        </div>
                      )}
                    </>
                  ) : null}

                  {isProductCustomizable(product) ? (
                    <div className={styles.notes}>
                      <label htmlFor={`notes-${line.productId}`}>
                        Product notes{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          (optional)
                        </span>
                      </label>
                      <input
                        id={`notes-${line.productId}`}
                        type="text"
                        placeholder="Optional notes for this product"
                        value={line.notes}
                        onChange={(event) =>
                          onChangeNotes(line.productId, event.target.value)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {productsError ? (
        <p className={styles.error} role="alert">
          {productsError}
        </p>
      ) : null}

      {lines.length > 0 ? (
        <button
          type="button"
          className={styles.ghostAdd}
          onClick={onAddProduct}
        >
          + Add another product
        </button>
      ) : null}
    </section>
  );
}
