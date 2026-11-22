import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { loadSiteData } from "@/lib/siteData.server";

const BASE_URL = "https://hspmart.com";

const STATIC_ROUTES: Array<{ path: string; changeFrequency: "weekly" | "monthly" }> = [
  { path: "", changeFrequency: "weekly" },
  { path: "/products", changeFrequency: "weekly" },
  { path: "/bulk-quote", changeFrequency: "monthly" },
  { path: "/about", changeFrequency: "monthly" },
  { path: "/contact", changeFrequency: "monthly" },
  { path: "/faq", changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The catalogue lives in the backend; load it, or the sitemap would list no products.
  await loadSiteData();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(
    ({ path, changeFrequency }) => ({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority: path === "" ? 1 : 0.8,
    }),
  );

  const productEntries: MetadataRoute.Sitemap = products
    .filter((product) => product.active !== false)
    .map((product) => ({
      url: `${BASE_URL}/products/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...productEntries];
}
