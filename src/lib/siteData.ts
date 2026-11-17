/**
 * The storefront's catalogue and content, as published by the backend (/api/site-data).
 *
 * Exposed as stable, in-place-updated objects so existing imports (`products`, `company`,
 * `categories`…) keep working on the server and in the browser:
 *  - server: pages call `await loadSiteData()` (src/lib/siteData.server.ts) before rendering;
 *  - browser: <SiteDataProvider> in the root layout applies the same payload before any child renders.
 */
import type { CompanyInfo } from "@/types/company";
import type { CatalogueNavCategory, ProductCategory } from "@/types/category";
import type { Product, ProductCategorySlug } from "@/types/product";
import type { AboutContent, Announcement, CommerceSettings, Faq, HomeContent, Navigation, SiteContent } from "@/types/site";

export type SiteData = { version: string; products: Product[]; content: SiteContent };

let currentVersion = "";

export const products: Product[] = [];
export const previewProducts: Product[] = [];
export const categories: ProductCategory[] = [];
export const productCategories: CatalogueNavCategory[] = [];
export const companyFaqs: Faq[] = [];
export const company = {} as CompanyInfo;
export const announcement = { messages: [], showPhone: false } as Announcement;
export const navigation = {} as Navigation;
export const home = {} as HomeContent;
export const about = {} as AboutContent;
export const commerce: CommerceSettings = { freeShippingThresholdPaise: 0, freightPaise: 0 };

const replace = <T,>(target: T[], next: T[]) => {
  target.splice(0, target.length, ...next);
};
const assign = <T extends object>(target: T, next: T) => {
  for (const k of Object.keys(target)) delete (target as Record<string, unknown>)[k];
  Object.assign(target, next);
};

export function siteDataVersion() {
  return currentVersion;
}

/** Idempotent per version. */
export function applySiteData(data: SiteData) {
  if (!data || data.version === currentVersion) return;
  const c = data.content;
  replace(products, data.products);
  replace(previewProducts, data.products.filter((p) => Boolean(p.layout)));
  replace(categories, c.categories);
  replace(productCategories, [
    { slug: "all", label: "All Products" },
    ...c.categories.map((cat) => ({ slug: cat.slug as ProductCategorySlug, label: cat.name })),
  ]);
  replace(companyFaqs, c.faqs);
  assign(company, c.company);
  assign(announcement, c.announcement);
  assign(navigation, c.navigation);
  assign(home, c.home);
  assign(about, c.about);
  assign(commerce, c.commerce);
  currentVersion = data.version;
}

/** Announcement text with live settings filled in. */
export function announcementMessages(): string[] {
  const threshold = `₹${(commerce.freeShippingThresholdPaise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return (announcement.messages ?? []).map((m) => m.replaceAll("{freeShippingThreshold}", threshold));
}

const rupeeText = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Free-delivery threshold and flat delivery charge, in rupees (set by the backend's checkout rules). */
export const freeShippingThreshold = () => commerce.freeShippingThresholdPaise / 100;
export const deliveryCharge = () => commerce.freightPaise / 100;
export const freeDeliveryText = () => `Free delivery on orders of ${rupeeText(commerce.freeShippingThresholdPaise)} and above`;

/** Canonical site URL (Site content → company → contact.website), without a trailing slash. */
export const siteUrl = () => (company.contact?.website ?? "").replace(/\/$/, "");
