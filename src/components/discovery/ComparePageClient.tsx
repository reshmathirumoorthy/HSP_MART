"use client";

import Link from "next/link";
import { productPriceLabel } from "@/data/products";
import { productAvailabilityLabel } from "@/lib/productAvailability";
import { isProductCustomizable } from "@/lib/productModel";
import { ProductVisual } from "@/components/ProductVisual";
import { EmptyState } from "@/components/EmptyState";
import { useCompare } from "@/context/CompareContext";
import { useCart } from "@/context/CartContext";
import styles from "./discovery.module.css";

export function ComparePageClient() {
  const { products, hydrated, removeFromCompare, clearCompare } = useCompare();
  const { addToCart, openCart } = useCart();

  return (
    <div className={styles.page} data-nav-surface="light">
      <div className="shell">
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Compare products</h1>
          <p className={styles.pageCopy}>
            Side-by-side details using the fields available in the HSP Mart
            catalogue.
          </p>
        </header>

        {!hydrated ? null : products.length < 2 ? (
          <EmptyState
            title="Select at least two products"
            copy={
              products.length === 1
                ? `Currently selected: ${products[0].name}. Add one more from the catalogue.`
                : "Choose products from the catalogue to compare side by side."
            }
            compact
          >
            <Link href="/products" className="btn btn--dark">
              Explore products
            </Link>
            {products.length > 0 ? (
              <button type="button" className={styles.ghost} onClick={clearCompare}>
                Clear selection
              </button>
            ) : null}
          </EmptyState>
        ) : (
          <>
            <div className={`${styles.wishlistActions} ${styles.compareToolbar}`}>
              <button type="button" className={styles.ghost} onClick={clearCompare}>
                Clear comparison
              </button>
            </div>
            <div className={styles.compareTableWrap}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th scope="col">Detail</th>
                    {products.map((product) => (
                      <th key={product.id} scope="col">
                        <div className={styles.compareVisual}>
                          <ProductVisual
                            product={product}
                            variant="compact"
                            sizes="100px"
                          />
                        </div>
                        <Link
                          href={`/products/${product.slug}`}
                          className={styles.compareName}
                        >
                          {product.name}
                        </Link>
                        <p className={styles.wishlistCategory}>{product.category}</p>
                        <p className={styles.wishlistPrice}>
                          {productPriceLabel(product)}
                        </p>
                        <div className={styles.compareCellActions}>
                          <Link
                            href={`/products/${product.slug}`}
                            className={styles.ghost}
                          >
                            View product
                          </Link>
                          <button
                            type="button"
                            className={`btn btn--forest ${styles.ghost}`}
                            onClick={() => {
                              const ok = addToCart(product.id, 1);
                              if (ok) openCart();
                            }}
                          >
                            Add to Cart
                          </button>
                          <button
                            type="button"
                            className={styles.ghost}
                            onClick={() => removeFromCompare(product.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">SKU</th>
                    {products.map((product) => (
                      <td key={`${product.id}-sku`}>{product.sku}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Category</th>
                    {products.map((product) => (
                      <td key={`${product.id}-category`}>{product.category}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Subcategory</th>
                    {products.map((product) => (
                      <td key={`${product.id}-subcategory`}>
                        {product.subcategory ?? "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Price</th>
                    {products.map((product) => (
                      <td key={`${product.id}-price`}>
                        {productPriceLabel(product)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Stock</th>
                    {products.map((product) => (
                      <td key={`${product.id}-stock`}>
                        {productAvailabilityLabel(product)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Customizable</th>
                    {products.map((product) => (
                      <td key={`${product.id}-custom`}>
                        {isProductCustomizable(product) ? "Yes" : "No"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Bulk available</th>
                    {products.map((product) => (
                      <td key={`${product.id}-bulk`}>
                        {product.bulkAvailable ? "Yes" : "No"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Tags</th>
                    {products.map((product) => (
                      <td key={`${product.id}-tags`}>
                        {product.tags.length
                          ? product.tags.slice(0, 4).join(", ")
                          : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">Description</th>
                    {products.map((product) => (
                      <td key={`${product.id}-desc`}>{product.description}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
