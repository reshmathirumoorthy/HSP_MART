/**
 * One-time bootstrap: imports the original catalogue and storefront content (scripts/db/seed-data),
 * and creates bootstrap staff users. Idempotent and non-destructive: rows that already exist are left
 * alone, so edits made in the admin app are never overwritten.
 */
import { sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { seedProducts as catalogue } from "./seed-data/products";
import { siteContent } from "./seed-data/content";
import { budgetBandFor, divisionFor, toPaise } from "../../src/lib/commerce/classify";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql, { schema });

const COLUMN_FIELDS = new Set(["id", "slug", "sku", "name", "price", "active", "stockStatus", "minOrderQuantity",
  "bulkAvailable", "customizable", "categorySlug", "subcategory", "currency", "category"]);

const rows = catalogue.map((p, i) => ({
  id: p.id,
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  division: divisionFor(p),
  budgetBand: budgetBandFor(p.price),
  categorySlug: p.categorySlug,
  subcategory: p.subcategory ?? null,
  pricePaise: toPaise(p.price),
  customizable: p.customizable,
  bulkAvailable: p.bulkAvailable,
  minOrderQuantity: p.minOrderQuantity ?? 1,
  active: p.active !== false,
  stockStatus: p.stockStatus,
  sortOrder: i,
  content: Object.fromEntries(Object.entries(p).filter(([k]) => !COLUMN_FIELDS.has(k))),
}));

for (let i = 0; i < rows.length; i += 100) {
  await db
    .insert(schema.products)
    .values(rows.slice(i, i + 100))
    .onConflictDoNothing({ target: schema.products.id });
}
// Rows created before product content existed get their presentation fields once.
for (const r of rows) {
  await db
    .update(schema.products)
    .set({ content: r.content, stockStatus: r.stockStatus, sortOrder: r.sortOrder })
    .where(dsql`${schema.products.id} = ${r.id} and ${schema.products.content}::text = '{}'`);
}

// Storefront content. "New arrivals" starts as the newest imported (Shopify) products.
const newest = catalogue
  .filter((p) => p.id.startsWith("hsp-") && p.active !== false && p.stockStatus !== "out_of_stock")
  .slice(0, 8)
  .map((p) => p.id);
const content = { ...siteContent, home: { ...siteContent.home, newArrivals: { ...siteContent.home.newArrivals, productIds: newest } } };
for (const [key, value] of Object.entries(content)) {
  await db.insert(schema.siteContent).values({ key, value }).onConflictDoNothing();
}

type Staff = { email: string; name: string; role: "hsp_admin" | "hsp_finance" | "hsp_procurement" };
const staff: Staff[] = process.env.NODE_ENV === "production" ? [] : [
  { email: "admin@hspmart.test", name: "HSP Admin", role: "hsp_admin" },
  { email: "finance@hspmart.test", name: "HSP Finance", role: "hsp_finance" },
  { email: "procurement@hspmart.test", name: "HSP Procurement", role: "hsp_procurement" },
];
const bootstrapAdmin = process.env.BOOTSTRAP_ADMIN_EMAIL;
if (bootstrapAdmin) staff.push({ email: bootstrapAdmin, name: "Admin", role: "hsp_admin" });

for (const s of staff) {
  await db.insert(schema.users).values(s).onConflictDoNothing();
}

const [{ count }] = await sql`select count(*)::int as count from products`;
console.log(`✓ seeded ${count} products, ${staff.length} staff users`);
await sql.end();
