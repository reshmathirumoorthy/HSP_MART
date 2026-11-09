import type { Product } from "@/data/products";
import { ProductBreadcrumb } from "@/components/ProductBreadcrumb";
import { ProductDetailInteractive } from "@/components/ProductDetailInteractive";
import { ProductCustomizationPanel } from "@/components/ProductCustomizationPanel";
import { RelatedProducts } from "@/components/RelatedProducts";
import { RecentlyViewed } from "@/components/discovery/RecentlyViewed";
import { TrackRecentlyViewed } from "@/components/discovery/TrackRecentlyViewed";
import { productSupportsCustomizationStudio } from "@/components/customization/resolveProductCustomization";
import styles from "./ProductDetail.module.css";

type Props = {
  product: Product;
  related: Product[];
  similar?: Product[];
};

export function ProductDetail({ product, related, similar = [] }: Props) {
  const hasVisualizer =
    productSupportsCustomizationStudio(product) &&
    !product.hamperConfig?.enabled;

  // "Home" crumb omitted — the navbar now provides a Home link.
  const breadcrumb = [
    {
      label: product.category,
      href: `/products?category=${product.categorySlug}`,
    },
    ...(product.subcategory
      ? [
          {
            label: product.subcategory,
            href: `/products?category=${product.categorySlug}&subcategory=${encodeURIComponent(product.subcategory)}`,
          },
        ]
      : []),
    { label: product.name },
  ];

  return (
    <div className={styles.page} data-nav-surface="light">
      <TrackRecentlyViewed productId={product.id} />
      <div className={`shell ${styles.top}`}>
        <ProductBreadcrumb items={breadcrumb} />

        <ProductDetailInteractive product={product} />
      </div>

      {!hasVisualizer ? <ProductCustomizationPanel product={product} /> : null}

      <RelatedProducts
        products={related}
        label="Related products"
        title="Related products"
        headingId="related-heading"
      />
      <RelatedProducts
        products={similar}
        label="Close matches"
        title="Similar products"
        headingId="similar-heading"
      />
      <RecentlyViewed
        title="Recently viewed"
        excludeProductId={product.id}
        excludeProductIds={[
          ...related.map((item) => item.id),
          ...similar.map((item) => item.id),
        ]}
      />
    </div>
  );
}
