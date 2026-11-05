import Link from "next/link";
import { ProductVisual } from "@/components/ProductVisual";
import { formatPrice } from "@/data/products";
import { productAvailabilityLabel } from "@/lib/productAvailability";
import {
  formatSearchMatchHint,
  type ProductSearchResult,
} from "@/lib/productSearch";
import { isProductCustomizable } from "@/lib/productModel";
import styles from "./SearchOverlay.module.css";

type Props = {
  result: ProductSearchResult;
  id: string;
  active: boolean;
  onNavigate: () => void;
};

export function SearchResultRow({ result, id, active, onNavigate }: Props) {
  const { product } = result;
  const matchHint = formatSearchMatchHint(result);
  const showStock =
    product.stockStatus === "low_stock" ||
    product.stockStatus === "out_of_stock";
  const categoryLine = product.subcategory
    ? `${product.category} · ${product.subcategory}`
    : product.category;

  return (
    <Link
      id={id}
      href={result.href}
      role="option"
      aria-selected={active}
      className={`${styles.productLink} ${active ? styles.optionActive : ""}`}
      onClick={onNavigate}
    >
      <div className={styles.visual}>
        <ProductVisual product={product} variant="compact" sizes="56px" />
      </div>
      <span className={styles.productBody}>
        <span className={styles.productName}>{product.name}</span>
        <span className={styles.productMeta}>{categoryLine}</span>
        <span className={styles.productMetaRow}>
          <span>{formatPrice(product.price, product.currency)}</span>
          {showStock ? (
            <span
              className={
                product.stockStatus === "out_of_stock"
                  ? styles.stockOut
                  : styles.stockLow
              }
            >
              {productAvailabilityLabel(product)}
            </span>
          ) : null}
          {isProductCustomizable(product) ? (
            <span className={styles.customTag}>Customizable</span>
          ) : null}
        </span>
        {matchHint ? (
          <span className={styles.matchHint}>{matchHint}</span>
        ) : null}
      </span>
    </Link>
  );
}
