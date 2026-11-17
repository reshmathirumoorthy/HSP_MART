/**
 * Offline scripts (verify-*) have no web server to load the catalogue from, so they apply the seed
 * fixtures to the in-memory store. Import this first.
 */
import { applySiteData } from "@/lib/siteData";
import type { SiteContent } from "@/types/site";
import { siteContent } from "./content";
import { seedProducts } from "./products";

applySiteData({
  version: "seed",
  products: seedProducts,
  content: { ...siteContent, commerce: { freeShippingThresholdPaise: 99_900, freightPaise: 9_900 } } as SiteContent,
});
