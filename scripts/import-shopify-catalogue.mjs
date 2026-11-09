/**
 * Imports the live HSP Mart production catalogue (hspmart.com, Shopify) into
 * a static TypeScript module: src/data/productionProducts.ts
 *
 * Uses only the public storefront JSON endpoints (/products.json,
 * /collections.json, /collections/<handle>/products.json). No credentials.
 *
 *   node scripts/import-shopify-catalogue.mjs
 *
 * Classification: Shopify products here have no product_type/tags, so the
 * category + subcategory are derived from collection membership using the
 * ordered RULES below (first match wins). Re-run any time to refresh.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "data", "productionProducts.ts");
const BASE = "https://hspmart.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) {
      throw new Error(`${url} -> HTTP ${res.status}`);
    }
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`${url} -> gave up after retries`);
}

async function fetchAll(pathname, key) {
  const all = [];
  for (let page = 1; page < 20; page += 1) {
    const data = await getJson(`${BASE}${pathname}?limit=250&page=${page}`);
    all.push(...data[key]);
    if (data[key].length < 250) break;
    await sleep(1200);
  }
  return all;
}

/** Ordered: [categorySlug, subcategory, collection-handle matcher] */
const RULES = [
  ["presentation", "Whiteboards", /^whiteboards-writing-boards|^writing-boards-ceramic|^combination-boards/],
  ["presentation", "Notice & Pin-up Boards", /^notice-pin-up-boards/],
  ["presentation", "Chalk Boards", /^green-chalk-boards/],
  ["presentation", "Easel Stands", /^wooden-easel-stand/],
  ["presentation", "Board Accessories", /^whiteboard-accessories/],
  ["presentation", "Presentation Supplies", /^presentation-supplies/],
  ["desk", "Obasix Desk Accessories", /^obasix-desk-accessories/],
  ["stationery", "Play Dough & Clay", /^play-dough-modelling-clay/],
  ["custom", "Customised Platters", /^customised-platters|^customised-gifts|^personalised-gifts/],
  ["gifts", "Wedding Gifting", /^wedding|^mehendi|^roka|^shagun|^trousseau|^milni/],
  ["gifts", "Festive Gifting", /^diwali|^diyas|^rakhi|^christmas|^festive|^dry-fruits/],
  ["gifts", "Corporate Gifting", /^corporate|^client-relationship|^rewards|^employee-welcome|^leather|^branded-bulk/],
  ["gifts", "Occasional Gifting", /^anniversary|^birthday|^baby-shower|^kids|^gifts-for-family|^return-gifts|^guest-return/],
];

const CATEGORY_NAMES = {
  stationery: "Stationery",
  office: "Office Essentials",
  desk: "Desk & Accessories",
  writing: "Writing Instruments",
  presentation: "Presentation",
  gifts: "Gifting",
  custom: "Custom Products",
};

const VISUAL_BY_CATEGORY = {
  presentation: "folder",
  desk: "organizer",
  stationery: "notebook",
  custom: "kit",
  gifts: "kit",
};

const TONES = ["sand", "stone", "clay", "olive", "charcoal", "taupe"];

/** Collections that are merchandising/tax buckets, not product classifications. */
const NON_TAG_COLLECTIONS = /^18-gst$|^best-selling-collection$/;

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToText(html) {
  return decodeEntities(
    (html ?? "")
      .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function shortFrom(text, title) {
  const first = text.split("\n").find((l) => l.length > 20 && !l.startsWith("•")) ?? "";
  const sentence = first.split(/(?<=[.!?])\s/)[0] ?? "";
  const s = sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}…` : sentence;
  return s || title;
}

function slugify(handle) {
  return handle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("Fetching products…");
  const shopProducts = await fetchAll("/products.json", "products");
  console.log(`  ${shopProducts.length} products`);

  console.log("Fetching collections…");
  const collections = await fetchAll("/collections.json", "collections");
  const membership = new Map(); // product handle -> [collection handles]
  const titles = new Map();
  for (const c of collections) {
    titles.set(c.handle, c.title);
    await sleep(1500);
    const items = await fetchAll(`/collections/${c.handle}/products.json`, "products");
    for (const p of items) {
      if (!membership.has(p.handle)) membership.set(p.handle, []);
      membership.get(p.handle).push(c.handle);
    }
    console.log(`  ${c.handle}: ${items.length}`);
  }

  const seenSlugs = new Set();
  const seenSkus = new Set();
  const out = [];
  const skipped = [];
  shopProducts.forEach((p, index) => {
    // Without an image the product cannot be presented; Shopify drafts-in-progress.
    if (!(p.images ?? []).length) {
      skipped.push(p.handle);
      return;
    }
    const cols = membership.get(p.handle) ?? [];
    const rule = RULES.find(([, , re]) => cols.some((h) => re.test(h)));
    const [categorySlug, subcategory] = rule ?? ["gifts", "Occasional Gifting"];

    const variants = p.variants ?? [];
    const available = variants.filter((v) => v.available);
    const priced = variants.map((v) => Number(v.price)).filter((n) => n > 0);
    const price = priced.length ? Math.min(...priced) : 0;
    const first = variants[0] ?? {};
    const compareAt = Number(first.compare_at_price) || 0;

    let slug = slugify(p.handle);
    if (seenSlugs.has(slug)) slug = `${slug}-${p.id}`;
    seenSlugs.add(slug);

    let sku = (first.sku && String(first.sku).trim()) || `HSP-${p.id}`;
    if (seenSkus.has(sku)) sku = `${sku}-${p.id}`;
    seenSkus.add(sku);

    const description = htmlToText(p.body_html);
    const isCorporate = cols.some((h) => /corporate|client|rewards|employee|branded/.test(h));
    const isCustom = categorySlug === "custom" || /personal|custom/i.test(p.title);

    const tags = [
      ...new Set(
        cols.filter((h) => !NON_TAG_COLLECTIONS.test(h)).map((h) => titles.get(h) ?? h),
      ),
    ];

    out.push({
      id: `hsp-${p.id}`,
      slug,
      sku,
      name: p.title.trim(),
      shortDescription: shortFrom(description, p.title.trim()),
      description: description || p.title.trim(),
      category: CATEGORY_NAMES[categorySlug],
      categorySlug,
      subcategory,
      brand: p.vendor && p.vendor !== "HSP Mart" ? p.vendor : undefined,
      // Sized at request time by src/lib/imageLoader.ts (Shopify CDN resizing).
      images: (p.images ?? []).map((img) => img.src),
      price,
      ...(compareAt > price ? { compareAtPrice: compareAt } : {}),
      currency: "INR",
      unit: "piece",
      stockStatus: available.length === 0 ? "out_of_stock" : "in_stock",
      bulkAvailable: categorySlug === "gifts" || categorySlug === "presentation" || isCorporate,
      customizable: isCustom,
      ...(isCustom ? { customizationTypes: ["text", "packaging"] } : {}),
      packagingOptions: categorySlug === "gifts" ? ["gift", "bulk"] : ["individual", "bulk"],
      tags,
      featured: false,
      // ₹0 on Shopify = premium hampers sold by enquiry ("price on request").
      ...(price === 0 ? { priceOnRequest: true } : {}),
      active: true,
      ...(variants.length > 1
        ? {
            specifications: {
              options: (p.options ?? [])
                .map((o) => `${o.name}: ${o.values.join(", ")}`)
                .join(" · "),
            },
          }
        : {}),
      tone: TONES[index % TONES.length],
      visual: VISUAL_BY_CATEGORY[categorySlug] ?? "kit",
      sourceUrl: `${BASE}/products/${p.handle}`,
    });
  });

  const header = `/**
 * HSP Mart production catalogue — imported from ${BASE} (Shopify storefront).
 * GENERATED by scripts/import-shopify-catalogue.mjs on ${new Date().toISOString().slice(0, 10)}.
 * Do not edit by hand; re-run the script to refresh.
 */

import type { Product } from "@/types/product";

export const productionProducts: Product[] = `;
  writeFileSync(OUT, `${header}${JSON.stringify(out, null, 2)};\n`);

  const counts = {};
  for (const p of out) counts[`${p.categorySlug} / ${p.subcategory}`] = (counts[`${p.categorySlug} / ${p.subcategory}`] ?? 0) + 1;
  console.log(`\nWrote ${out.length} products → ${path.relative(ROOT, OUT)}`);
  console.table(counts);
  console.log(`skipped (no image): ${skipped.length} ${skipped.join(", ")}`);
  console.log(`price on request: ${out.filter((p) => p.priceOnRequest).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
