"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import type { Product } from "@/types/product";
import type {
  AdvancedCustomizationState,
  ProductCustomizationConfig,
} from "@/types/customization";
import { AdvancedCustomizationPreview } from "@/components/customization/AdvancedCustomizationPreview";
import { buildCustomizationReviewModel } from "@/lib/customization/review";
import styles from "./customization.module.css";

type Props = {
  product: Product;
  config: ProductCustomizationConfig;
  state: AdvancedCustomizationState;
  quantity: number;
  added: boolean;
  onZoneChange: (zoneId: string) => void;
  onEdit: () => void;
  onAddToCart: () => void;
  onDismissSuccess?: () => void;
};

/**
 * Final customer review before add-to-cart.
 * Session remains the source of truth — review is derived UI only.
 */
export function CustomizationReview({
  product,
  config,
  state,
  quantity,
  added,
  onZoneChange,
  onEdit,
  onAddToCart,
  onDismissSuccess,
}: Props) {
  const model = useMemo(
    () =>
      buildCustomizationReviewModel({
        product,
        config,
        state,
        quantity,
      }),
    [config, product, quantity, state],
  );

  const customizedSurfaceIds = model.surfaces.map((surface) => surface.surfaceId);
  const customizedSurfaceKey = customizedSurfaceIds.join("|");

  useEffect(() => {
    if (!customizedSurfaceKey) return;
    const ids = customizedSurfaceKey.split("|");
    if (!ids.includes(state.activeZoneId)) {
      onZoneChange(ids[0]);
    }
  }, [customizedSurfaceKey, onZoneChange, state.activeZoneId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEdit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEdit]);

  return (
    <div
      className={styles.reviewPanel}
      role="region"
      aria-labelledby="customization-review-heading"
    >
      <header className={styles.reviewHeader}>
        <p className={styles.eyebrow}>Final review</p>
        <h3 id="customization-review-heading" className={styles.reviewTitle}>
          Review your customization before adding to cart
        </h3>
        <p className={styles.copy}>
          Check the preview and summary. You can return to editing anytime —
          nothing is lost.
        </p>
      </header>

      {added ? (
        <div className={styles.reviewSuccess} role="status">
          <p className={styles.reviewSuccessTitle}>
            Customized product added to cart.
          </p>
          <div className={styles.reviewSuccessActions}>
            <Link href="/cart" className="btn btn--dark">
              View cart
            </Link>
            <button
              type="button"
              className="btn btn--ghost-dark"
              onClick={onDismissSuccess ?? onEdit}
            >
              Continue shopping
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.reviewLayout}>
        <div className={styles.reviewPreview}>
          <AdvancedCustomizationPreview
            product={product}
            config={config}
            state={state}
            onLayerMove={() => undefined}
            onZoneChange={onZoneChange}
            reviewMode
            surfaceIdsFilter={
              customizedSurfaceIds.length > 0
                ? customizedSurfaceIds
                : undefined
            }
          />
        </div>

        <aside className={styles.reviewAside} aria-label="Customization summary">
          <div className={styles.reviewBlock}>
            <p className={styles.label}>Product</p>
            <p className={styles.reviewValue}>{model.productName}</p>
          </div>

          {model.variantLabel ? (
            <div className={styles.reviewBlock}>
              <p className={styles.label}>Variant</p>
              <p className={styles.reviewValue}>Colour: {model.variantLabel}</p>
            </div>
          ) : null}

          <div className={styles.reviewBlock}>
            <p className={styles.label}>Quantity</p>
            <p className={styles.reviewValue}>{model.quantity}</p>
          </div>

          <div className={styles.reviewBlock}>
            <p className={styles.label}>Customization</p>
            {model.surfaces.length === 0 ? (
              <p className={styles.helper}>No design elements yet.</p>
            ) : (
              <ul className={styles.reviewSurfaceList}>
                {model.surfaces.map((surface) => (
                  <li key={surface.surfaceId}>
                    <button
                      type="button"
                      className={`${styles.reviewSurfaceBtn} ${
                        state.activeZoneId === surface.surfaceId
                          ? styles.reviewSurfaceBtnActive
                          : ""
                      }`}
                      onClick={() => onZoneChange(surface.surfaceId)}
                      aria-pressed={state.activeZoneId === surface.surfaceId}
                    >
                      ✓ {surface.surfaceLabel}
                    </button>
                    <ul className={styles.reviewElementList}>
                      {surface.elements.map((element) => (
                        <li key={element.id}>
                          {element.label}
                          {element.detail ? (
                            <span className={styles.reviewElementDetail}>
                              {" "}
                              · {element.detail}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {model.errors.length > 0 ? (
            <div className={styles.reviewIssues} role="alert">
              <p className={styles.label}>Needs attention</p>
              <ul>
                {model.errors.map((issue, index) => (
                  <li key={`err-${issue.surfaceId}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {model.warnings.length > 0 ? (
            <div className={styles.reviewWarnings} role="status">
              <p className={styles.label}>Please note</p>
              <ul>
                {model.warnings.map((issue, index) => (
                  <li key={`warn-${issue.surfaceId}-${index}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {model.canAddToCart ? (
            <p className={styles.reviewReady} role="status">
              Ready to add — preview represents your design for review.
            </p>
          ) : null}

          <div className={styles.reviewActions}>
            <button
              type="button"
              className="btn btn--ghost-dark"
              onClick={onEdit}
            >
              Edit customization
            </button>
            <button
              type="button"
              className="btn btn--dark"
              onClick={onAddToCart}
              disabled={!model.canAddToCart || added}
            >
              {added ? "Added to cart ✓" : "Add customized product to cart"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
