import type { ReactNode } from "react";
import type { Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import styles from "./ProductGrid.module.css";

type Props = {
  products: Product[];
  onWishlistRemoved?: (product: Product, previousIndex: number) => void;
  renderActions?: (product: Product) => ReactNode;
};

export function ProductGrid({
  products,
  onWishlistRemoved,
  renderActions,
}: Props) {
  return (
    <ul className={styles.grid}>
      {products.map((product, index) => (
        <li key={product.id} style={{ animationDelay: `${Math.min(index % 24, 11) * 0.04}s` }}>
          <ProductCard
            product={product}
            onWishlistRemoved={onWishlistRemoved}
            actions={renderActions?.(product)}
          />
        </li>
      ))}
    </ul>
  );
}
