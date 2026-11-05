/**
 * One-shot generator for Phase 8 product catalogue.
 * Run: node scripts/generate-phase8-products.mjs
 */
import fs from "node:fs";
import path from "node:path";

const skuPrefix = {
  stationery: "HSP-STN",
  office: "HSP-OFF",
  desk: "HSP-DSK",
  writing: "HSP-WRT",
  presentation: "HSP-PRS",
  gifts: "HSP-GFT",
  custom: "HSP-CUS",
};

const categoryNames = {
  stationery: "Stationery",
  office: "Office Essentials",
  desk: "Desk & Accessories",
  writing: "Writing Instruments",
  presentation: "Presentation",
  gifts: "Gifting",
  custom: "Custom Products",
};

const counters = Object.fromEntries(Object.keys(skuPrefix).map((k) => [k, 0]));

function nextSku(slug) {
  counters[slug] += 1;
  return `${skuPrefix[slug]}-${String(counters[slug]).padStart(3, "0")}`;
}

function customizationFor(p) {
  if (!p.customizable) return undefined;
  if (p.categorySlug === "custom" || p.subcategory === "Branded") {
    return ["logo", "branding", "printing", "packaging"];
  }
  if (p.visual === "notebook") return ["logo", "printing", "branding"];
  if (p.visual === "pen") return ["logo", "branding"];
  if (p.visual === "folder") return ["logo", "printing", "branding"];
  if (p.visual === "tumbler") return ["logo", "branding"];
  if (p.visual === "kit" || p.categorySlug === "gifts") {
    return ["branding", "packaging", "logo"];
  }
  return ["branding", "other"];
}

function packagingFor(p) {
  if (p.categorySlug === "gifts" || p.categorySlug === "custom") {
    return ["individual", "bulk", "gift", "custom"];
  }
  if (p.bulkAvailable) return ["individual", "bulk"];
  return undefined;
}

/** Existing catalogue facts preserved; copy refined for professional tone. */
const raw = [
  { id: "executive-notebook-01", slug: "executive-notebook", name: "Executive Notebook", categorySlug: "stationery", subcategory: "Notebooks", shortDescription: "Hardcover notebook for meetings, planning and everyday notes.", description: "A hardcover notebook suited to meetings, planning and daily note-taking. Useful for individual desks and branded bulk orders.", price: 420, tone: "stone", visual: "notebook", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 50, tags: ["notebook", "stationery", "journal", "hardcover"], layout: "support" },
  { id: "spiral-notebook-01", slug: "spiral-notebook", name: "Spiral Notebook", categorySlug: "stationery", subcategory: "Notebooks", shortDescription: "Spiral-bound notebook for training notes and everyday writing.", description: "A practical spiral notebook for training sessions, workshops and daily writing at the desk.", price: 180, tone: "sand", visual: "notebook", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, minOrderQuantity: 100, tags: ["notebook", "spiral", "office", "everyday"] },
  { id: "writing-pad-01", slug: "premium-writing-pad", name: "Writing Pad", categorySlug: "stationery", subcategory: "Pads", shortDescription: "Writing pad for desk notes, sketches and quick lists.", description: "A smooth writing pad for desk notes, sketches and quick lists. Suitable for offices and meeting rooms.", price: 260, tone: "clay", visual: "folder", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["pad", "writing", "stationery", "desk"] },
  { id: "sticky-notes-01", slug: "sticky-notes-set", name: "Sticky Notes Set", categorySlug: "stationery", subcategory: "Notes", shortDescription: "Sticky notes for reminders, planners and shared boards.", description: "A set of sticky notes for reminders, planners and shared office boards.", price: 149, tone: "sand", visual: "kit", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["sticky", "notes", "office", "planner"] },
  { id: "document-tray-01", slug: "document-tray", name: "Document Tray", categorySlug: "office", subcategory: "Organization", shortDescription: "Stackable tray to keep papers ordered on a desk.", description: "Stackable document tray for keeping papers ordered on office and home desks.", price: 690, tone: "taupe", visual: "organizer", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["tray", "documents", "office", "storage"] },
  { id: "file-organizer-01", slug: "file-organizer", name: "File Organizer", categorySlug: "office", subcategory: "Organization", shortDescription: "Upright organizer for active folders and paperwork.", description: "Upright file organizer for active folders and daily paperwork.", price: 850, tone: "stone", visual: "organizer", featured: true, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["files", "organizer", "office"] },
  { id: "document-folder-01", slug: "document-folder", name: "Document Folder", categorySlug: "office", subcategory: "Folders", shortDescription: "Durable folder for carrying and storing papers.", description: "Durable document folder for carrying and storing important papers.", price: 320, tone: "clay", visual: "folder", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["folder", "documents", "office"] },
  { id: "desktop-storage-01", slug: "desktop-storage-box", name: "Desktop Storage Box", categorySlug: "office", subcategory: "Storage", shortDescription: "Closed box for stationery, cables and desk clutter.", description: "Closed storage box for stationery, cables and desk clutter.", price: 980, tone: "taupe", visual: "kit", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["storage", "box", "desk", "office"] },
  { id: "clipboard-01", slug: "clipboard", name: "Clipboard", categorySlug: "office", subcategory: "Tools", shortDescription: "Slim clipboard for forms and checklists.", description: "Slim clipboard for forms, checklists and note-taking on the go.", price: 220, tone: "charcoal", visual: "folder", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["clipboard", "forms", "office"] },
  { id: "document-wallet-01", slug: "document-wallet", name: "Document Wallet", categorySlug: "office", subcategory: "Folders", shortDescription: "Expanding wallet for meetings and archives.", description: "Expanding document wallet for travel, meetings and archives.", price: 450, tone: "olive", visual: "folder", featured: false, stockStatus: "out_of_stock", customizable: false, bulkAvailable: true, tags: ["wallet", "documents", "travel"] },
  { id: "workspace-kit-01", slug: "workspace-essentials-kit", name: "Workspace Essentials Kit", categorySlug: "office", subcategory: "Kits", shortDescription: "Ready kit of useful workspace staples.", description: "A ready kit of useful workspace staples for home or office setup.", price: 2400, tone: "taupe", visual: "kit", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, minOrderQuantity: 25, tags: ["kit", "workspace", "office", "essentials"], layout: "rail" },
  { id: "desk-organizer-01", slug: "modular-desk-organizer", name: "Modular Desk Organizer", categorySlug: "desk", subcategory: "Organizers", shortDescription: "Modular organizer with trays and holders.", description: "Modular organizer with trays and holders for a calm workspace. Available for individual desks and bulk office setups.", price: 890, tone: "sand", visual: "organizer", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 25, tags: ["organizer", "desk", "modular", "workspace"], badge: "Featured", layout: "featured" },
  { id: "cable-organizer-01", slug: "cable-organizer", name: "Cable Organizer", categorySlug: "desk", subcategory: "Organizers", shortDescription: "Compact organizer for chargers and cords.", description: "Compact cable organizer to keep chargers and cords tidy.", price: 390, tone: "charcoal", visual: "kit", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["cable", "desk", "organizer"] },
  { id: "pen-holder-01", slug: "pen-holder", name: "Pen Holder", categorySlug: "desk", subcategory: "Holders", shortDescription: "Weighted holder for everyday writing tools.", description: "Weighted pen holder for everyday writing tools.", price: 340, tone: "olive", visual: "organizer", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["pen", "holder", "desk"] },
  { id: "desk-tray-01", slug: "desk-tray", name: "Desk Tray", categorySlug: "desk", subcategory: "Trays", shortDescription: "Low-profile tray for mail, notes and small essentials.", description: "Low-profile desk tray for mail, notes and small essentials.", price: 520, tone: "stone", visual: "organizer", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["tray", "desk", "accessories"] },
  { id: "card-holder-01", slug: "business-card-holder", name: "Business Card Holder", categorySlug: "desk", subcategory: "Holders", shortDescription: "Desktop card holder for reception and meeting rooms.", description: "Desktop card holder for reception desks and meeting rooms.", price: 480, tone: "clay", visual: "kit", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["cards", "holder", "desk"] },
  { id: "laptop-stand-01", slug: "laptop-stand", name: "Laptop Stand", categorySlug: "desk", subcategory: "Stands", shortDescription: "Angled stand for better desk posture.", description: "Angled laptop stand for better posture at home or office.", price: 1650, tone: "charcoal", visual: "organizer", featured: true, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["laptop", "stand", "desk"] },
  { id: "desk-calendar-01", slug: "desk-calendar", name: "Desk Calendar", categorySlug: "desk", subcategory: "Planning", shortDescription: "Standing calendar with writing space.", description: "Standing desk calendar with generous writing space.", price: 390, tone: "sand", visual: "notebook", featured: false, stockStatus: "low_stock", customizable: true, bulkAvailable: true, tags: ["calendar", "desk", "planning"] },
  { id: "premium-pen-set-01", slug: "premium-pen-set", name: "Premium Pen Set", categorySlug: "writing", subcategory: "Pens", shortDescription: "Pen set for signing, journaling and daily notes.", description: "Balanced pen set suited to signing, journaling and daily notes. Also suitable for gifting and branded bulk orders.", price: 560, tone: "charcoal", visual: "pen", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["pen", "writing", "set", "gift"], layout: "rail" },
  { id: "gel-pen-pack-01", slug: "gel-pen-pack", name: "Gel Pen Pack", categorySlug: "writing", subcategory: "Pens", shortDescription: "Multipack of gel pens for desks and kits.", description: "Smooth gel pens in a practical multipack for desks, kits and office restocking.", price: 199, tone: "stone", visual: "pen", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["gel", "pen", "pack", "writing"] },
  { id: "marker-set-01", slug: "marker-set", name: "Marker Set", categorySlug: "writing", subcategory: "Markers", shortDescription: "Marker set for boards, labels and workshops.", description: "Reliable marker set for boards, labels and workshop use.", price: 310, tone: "olive", visual: "pen", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["marker", "writing", "office"] },
  { id: "mechanical-pencil-01", slug: "mechanical-pencil-set", name: "Mechanical Pencil Set", categorySlug: "writing", subcategory: "Pencils", shortDescription: "Mechanical pencils for drafting and sketching.", description: "Precise mechanical pencils for drafting, meeting sketches and technical notes.", price: 275, tone: "taupe", visual: "pen", featured: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, tags: ["pencil", "mechanical", "writing", "drafting"] },
  { id: "signature-pen-01", slug: "signature-pen-set", name: "Signature Pen Set", categorySlug: "writing", subcategory: "Pens", shortDescription: "Pen collection for everyday writing and gifting.", description: "A considered pen collection for everyday writing and gifting.", price: 180, tone: "charcoal", visual: "pen", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 100, tags: ["pen", "signature", "writing"], layout: "rail" },
  { id: "presentation-folder-01", slug: "presentation-folder-pack", name: "Presentation Folder Pack", categorySlug: "presentation", subcategory: "Folders", shortDescription: "Folders for proposals, pitches and handouts.", description: "Clean presentation folders for proposals, pitches and handouts.", price: 1250, tone: "clay", visual: "folder", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 25, tags: ["presentation", "folder", "meeting"], layout: "support" },
  { id: "document-portfolio-01", slug: "document-portfolio", name: "Document Portfolio", categorySlug: "presentation", subcategory: "Portfolios", shortDescription: "Portfolio for reviews and client meetings.", description: "Structured portfolio for interviews, reviews and client meetings.", price: 1450, tone: "olive", visual: "folder", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["portfolio", "presentation", "meeting"] },
  { id: "conference-folder-01", slug: "conference-folder", name: "Conference Folder", categorySlug: "presentation", subcategory: "Folders", shortDescription: "Conference folder with notepad space.", description: "Conference folder with notepad space for workshops and events.", price: 980, tone: "stone", visual: "folder", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["conference", "folder", "events"] },
  { id: "meeting-kit-01", slug: "meeting-kit", name: "Meeting Kit", categorySlug: "presentation", subcategory: "Kits", shortDescription: "Compact kit with pad, pen and folder essentials.", description: "Compact meeting kit with pad, pen and folder essentials.", price: 1890, tone: "taupe", visual: "kit", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["meeting", "kit", "presentation"] },
  { id: "executive-gift-set-01", slug: "executive-gift-set", name: "Executive Gift Set", categorySlug: "gifts", subcategory: "Gift Sets", shortDescription: "Gift set for appreciation, onboarding and occasions.", description: "A composed gift set for appreciation, onboarding and occasions. Branding and packaging can be requested for bulk orders.", price: 2490, tone: "charcoal", visual: "kit", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["gift", "executive", "set"] },
  { id: "notebook-pen-gift-01", slug: "notebook-pen-gift-set", name: "Notebook & Pen Gift Set", categorySlug: "gifts", subcategory: "Gift Sets", shortDescription: "Paired notebook and pen set for gifting.", description: "Paired notebook and pen set for personal or team gifting.", price: 790, tone: "sand", visual: "notebook", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["gift", "notebook", "pen", "set"] },
  { id: "desk-gift-set-01", slug: "desk-gift-set", name: "Desk Gift Set", categorySlug: "gifts", subcategory: "Gift Sets", shortDescription: "Desk essentials curated as a ready gift set.", description: "Desk essentials curated as a ready-to-give gift set.", price: 1590, tone: "clay", visual: "organizer", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["gift", "desk", "set"] },
  { id: "welcome-kit-01", slug: "employee-welcome-kit", name: "Employee Welcome Kit", categorySlug: "gifts", subcategory: "Kits", shortDescription: "Welcome kit for new joiners.", description: "Welcome kit for new joiners with practical everyday essentials. Suitable for branded onboarding programmes.", price: 3200, tone: "olive", visual: "kit", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["welcome", "kit", "gift", "team"] },
  { id: "corporate-gift-box-01", slug: "corporate-gift-box", name: "Corporate Gift Box", categorySlug: "gifts", subcategory: "Gift Boxes", shortDescription: "Gift box for client events and team moments.", description: "Gift box ready for client events, festivals and team moments.", price: 2100, tone: "taupe", visual: "kit", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, tags: ["gift", "box", "corporate"] },
  { id: "branded-tumbler-01", slug: "insulated-tumbler", name: "Insulated Tumbler", categorySlug: "gifts", subcategory: "Drinkware", shortDescription: "Insulated tumbler for daily use and branded gifting.", description: "Insulated tumbler suited to daily use and branded gifting.", price: 650, tone: "olive", visual: "tumbler", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 50, tags: ["tumbler", "gift", "drinkware"], layout: "rail" },
  { id: "custom-notebook-01", slug: "custom-branded-notebook", name: "Custom Branded Notebook", categorySlug: "custom", subcategory: "Branded", shortDescription: "Notebook option for logo, name or packaging personalization.", description: "Notebook option designed for logo, name or packaging personalization. Pricing for branding is confirmed through a bulk quote.", price: 520, tone: "stone", visual: "notebook", featured: true, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 50, tags: ["custom", "notebook", "branded", "logo"], badge: "Customizable" },
  { id: "custom-pen-01", slug: "custom-branded-pen", name: "Custom Branded Pen", categorySlug: "custom", subcategory: "Branded", shortDescription: "Pen option ready for printed or engraved branding.", description: "Pen option ready for engraving or printed branding at volume. Request a quote for branding details.", price: 240, tone: "charcoal", visual: "pen", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 100, tags: ["custom", "pen", "branded"] },
  { id: "custom-folder-01", slug: "custom-presentation-folder", name: "Custom Presentation Folder", categorySlug: "custom", subcategory: "Branded", shortDescription: "Presentation folder for logo placement and event branding.", description: "Presentation folder designed for logo placement and event branding.", price: 1380, tone: "clay", visual: "folder", featured: false, stockStatus: "in_stock", customizable: true, bulkAvailable: true, minOrderQuantity: 25, tags: ["custom", "folder", "presentation", "branded"] },
];

const products = raw.map((p) => {
  const sku = nextSku(p.categorySlug);
  const customizationTypes = customizationFor(p);
  const packagingOptions = packagingFor(p);
  const tags = [...p.tags];
  if (p.featured && !tags.includes("featured")) tags.push("featured");
  if (p.customizable && !tags.includes("customizable")) tags.push("customizable");
  if (p.bulkAvailable && !tags.includes("bulk")) tags.push("bulk");

  return {
    id: p.id,
    slug: p.slug,
    sku,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    category: categoryNames[p.categorySlug],
    categorySlug: p.categorySlug,
    subcategory: p.subcategory,
    images: [],
    price: p.price,
    currency: "INR",
    unit: "piece",
    stockStatus: p.stockStatus,
    minOrderQuantity: p.minOrderQuantity,
    bulkAvailable: p.bulkAvailable,
    customizable: p.customizable,
    customizationTypes,
    packagingOptions,
    tags,
    featured: p.featured,
    active: true,
    badge: p.badge,
    tone: p.tone,
    visual: p.visual,
    layout: p.layout,
  };
});

const outPath = path.resolve("src/data/products.ts");
const header = `/**
 * Canonical HSP Mart product catalogue.
 *
 * DEMO / MOCK FRONTEND DATA
 * - Prices, SKUs and stock values are sample identifiers for the frontend only.
 * - Not live ERPNext Item / Item Price / Bin data.
 * - Stable \`id\` and \`slug\` values are preserved for localStorage compatibility.
 */

import { productCategories } from "@/data/categories";
import type {
  FilterState,
  PriceRangeKey,
  Product,
  ProductCategorySlug,
  ProductTone,
  ProductVisualKind,
  SortOption,
} from "@/types/product";

export type {
  FilterState,
  PriceRangeKey,
  Product,
  ProductCategorySlug,
  ProductTone,
  ProductVisualKind,
  SortOption,
} from "@/types/product";

export { productCategories };

export const priceRanges: { key: PriceRangeKey; label: string }[] = [
  { key: "all", label: "All prices" },
  { key: "under-500", label: "Under ₹500" },
  { key: "500-1000", label: "₹500–₹1,000" },
  { key: "1000-2000", label: "₹1,000–₹2,000" },
  { key: "2000-plus", label: "₹2,000+" },
];

export const sortOptions: { key: SortOption; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "name-asc", label: "Name: A–Z" },
];

export function formatPrice(price: number, currency: Product["currency"] = "INR"): string {
  if (currency !== "INR") {
    return \`\${currency} \${price.toLocaleString("en-IN")}\`;
  }
  return \`₹\${price.toLocaleString("en-IN")}\`;
}

/** Full mock catalogue — replace with API later. */
export const products: Product[] = `;

function toTs(obj) {
  const lines = [];
  lines.push("  {");
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`    ${key}: [],`);
      } else if (typeof value[0] === "string") {
        lines.push(`    ${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}],`);
      } else {
        lines.push(`    ${key}: ${JSON.stringify(value)},`);
      }
    } else if (typeof value === "string") {
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    } else if (typeof value === "boolean" || typeof value === "number") {
      lines.push(`    ${key}: ${value},`);
    } else {
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    }
  }
  lines.push("  }");
  return lines.join("\n");
}

const body = products.map(toTs).join(",\n");
const footer = `;

/** Homepage product preview subset — derived from the catalogue. */
export const previewProducts: Product[] = products.filter((product) => Boolean(product.layout));

export function getActiveProducts(source: Product[] = products): Product[] {
  return source.filter((product) => product.active);
}
`;

fs.writeFileSync(outPath, header + "[\n" + body + "\n]" + footer, "utf8");
console.log("Wrote", outPath, "products:", products.length);
console.log("SKUs sample:", products.slice(0, 3).map((p) => p.sku));
