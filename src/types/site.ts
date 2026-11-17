/**
 * Storefront content managed in the admin app (Site content) and served by the backend
 * (/api/site-data). Keys match rows in the `site_content` table.
 */
import type { CompanyInfo } from "@/types/company";
import type { ProductCategory } from "@/types/category";

export type NavLink = { label: string; href: string };
export type Faq = { id: string; question: string; answer: string };

export type Announcement = {
  /** Messages shown in the top bar. `{freeShippingThreshold}` is replaced with the live threshold. */
  messages: string[];
  showPhone: boolean;
};

export type Navigation = {
  /** Desktop main menu. */
  primary: NavLink[];
  /** Gifting occasions in the main menu. */
  gifting: NavLink[];
  /** Extra shop links after products/categories. */
  shopExtras: NavLink[];
  explore: NavLink[];
  footer: { shop: NavLink[]; help: NavLink[]; legal: NavLink[] };
};

export type HomeContent = {
  hero: {
    titleBefore: string;
    titleEmphasis: string;
    titleAfter: string;
    lead: string;
    primaryCta: NavLink;
    secondaryCta: NavLink;
    /** Product slug pictured in the hero; empty picks a gift with a photo. */
    featuredSlug: string;
  };
  occasions: { label: string; note: string; subcategory: string }[];
  hampers: { title: string; copy: string; link: NavLink; productIds: string[] };
  trail: { title: string; copy: string; steps: { title: string; copy: string }[]; cta: NavLink; note: string };
  dispatch: { title: string; copy: string; link: NavLink; productIds: string[] };
  house: { title: string; copy: string; links: NavLink[]; productIds: string[] };
  close: { title: string; cta: NavLink; address: string };
  newArrivals: { title: string; copy: string; link: NavLink; productIds: string[] };
};

export type AboutContent = {
  title: string;
  focusTitle: string;
  servicesTitle: string;
  legalTitle: string;
  actions: NavLink[];
};

/** Read-only commercial settings published by the backend (not edited as content). */
export type CommerceSettings = { freeShippingThresholdPaise: number; freightPaise: number };

export type SiteContent = {
  company: CompanyInfo;
  faqs: Faq[];
  categories: ProductCategory[];
  announcement: Announcement;
  navigation: Navigation;
  home: HomeContent;
  about: AboutContent;
  commerce: CommerceSettings;
};
