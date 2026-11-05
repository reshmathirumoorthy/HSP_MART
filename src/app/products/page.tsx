import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsCatalogue } from "@/components/ProductsCatalogue";
import { filtersFromSearchParams } from "@/lib/catalogue";
import { ProductBreadcrumb } from "@/components/ProductBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { getCategoryLabel } from "@/data/categories";
import type { ProductCategorySlug } from "@/types/product";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse everyday stationery, desk essentials, gifts and customizable products.",
  openGraph: {
    title: "Products | HSP Mart",
    description:
      "Browse everyday stationery, desk essentials, gifts and customizable products.",
    url: "/products",
    siteName: "HSP Mart",
    type: "website",
  },
};

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const raw = await searchParams;
  const params = new URLSearchParams();

  const category = toParam(raw.category);
  const subcategory = toParam(raw.subcategory);
  const search = toParam(raw.search) ?? toParam(raw.q);
  const price = toParam(raw.price);
  const stock = toParam(raw.stock);
  const customizable = toParam(raw.customizable);
  const bulk = toParam(raw.bulk);
  const sort = toParam(raw.sort);

  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  if (search) params.set("search", search);
  if (price) params.set("price", price);
  if (stock) params.set("stock", stock);
  if (customizable) params.set("customizable", customizable);
  if (bulk) params.set("bulk", bulk);
  if (sort) params.set("sort", sort);

  const initialFilters = filtersFromSearchParams(params);

  // UI breadcrumb trail — the leading "Home" crumb is omitted because the
  // navbar now provides a Home link. JSON-LD keeps the full trail for SEO.
  const breadcrumbTrail = [
    ...(category ? [{ label: "Products", href: "/products" }] : []),
    ...(category && category !== "all"
      ? [{ label: getCategoryLabel(category as "stationery" | "office" | "desk" | "writing" | "presentation" | "gifts" | "custom"), href: `/products?category=${category}` }]
      : []),
    ...(subcategory ? [{ label: subcategory }] : []),
    ...(search ? [{ label: `Search: "${search}"` }] : []),
  ];

  const jsonLdTrail = [{ label: "Home", href: "/" }, ...breadcrumbTrail];

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={breadcrumbJsonLd(jsonLdTrail.map((b) => ({ name: b.label, url: b.href ? `https://hspmart.com${b.href}` : undefined })))} />
      {breadcrumbTrail.length > 0 ? (
        <ProductBreadcrumb items={breadcrumbTrail} />
      ) : null}
      <Suspense
        fallback={
          <div className="shell" data-nav-surface="light" style={{ paddingTop: "2.5rem" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Loading products…
            </p>
          </div>
        }
      >
        <ProductsCatalogue initialFilters={initialFilters} />
      </Suspense>
    </>
  );
}
