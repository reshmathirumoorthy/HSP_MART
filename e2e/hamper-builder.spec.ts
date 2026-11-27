/**
 * Dimension-based hamper builder (docs/hamper-builder-plan.md). Test ids HB-x.y match the plan's test table
 * (ISO/IEC/IEEE 29119-3 style: each case has preconditions, action and expected result there).
 * Run headed: npx playwright test e2e/hamper-builder.spec.ts --headed
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { E2E_BASE_URL, E2E_REVALIDATE_SECRET } from "../playwright.config";
import { adminUrl, asUser, sql, uniqueEmail } from "./helpers";
import fx from "./fixtures/hamper-fit-cases.json" with { type: "json" };

/** Real catalogue photos, so the previews can be checked against what the products look like. */
const SEED_IMAGES: Record<string, string> = {
  mug: "/images/products/trendy-tumbler-main.png", notebook: "/images/products/a5-fancy-magnetic-notebook-main.jpg",
  bottle: "/images/products/vacuum-bottle-main.jpg", heavy: "/images/products/calculator-diary-main.jpg",
  pen: "/images/products/parker-vector-pen-main.jpg", jar: "/images/products/ss-sipper-main.png",
  tile: "/images/products/sticky-notes-set-main.webp", brick: "/images/products/auto-storage-box-main.jpg",
};

const img = (f: string) => `/images/products/${f}`;
const sides = (front: string, back = front, left = front, right = front, top = front, bottom = front) =>
  ({ front: img(front), back: img(back), left: img(left), right: img(right), top: img(top), bottom: img(bottom) });
/** 3D models for the seeds: round items with side photos, box items with six photos, one uploaded .glb. */
const SEED_MODELS: Record<string, unknown> = {
  mug: { kind: "photos", shape: "round", faces: sides("trendy-tumbler-main.png", "trendy-tumbler-2.jpg", "trendy-tumbler-3.jpg", "trendy-tumbler-4.jpg", "trendy-tumbler-5.jpg") },
  bottle: { kind: "photos", shape: "round", faces: sides("vacuum-bottle-main.jpg", "vacuum-bottle-2.jpg", "vacuum-bottle-alt.jpg", "vacuum-bottle-2.jpg") },
  jar: { kind: "photos", shape: "round", faces: sides("ss-sipper-main.png", "ss-sipper-2.png", "ss-sipper-3.png", "ss-sipper-4.png") },
  notebook: { kind: "photos", shape: "box", faces: sides("a5-fancy-magnetic-notebook-2.jpg", "a5-fancy-magnetic-notebook-3.jpg", "a5-fancy-magnetic-notebook-4.jpg", "a5-fancy-magnetic-notebook-4.jpg", "a5-fancy-magnetic-notebook-main.jpg") },
  heavy: { kind: "photos", shape: "box", faces: sides("calculator-diary-2.jpg", "calculator-diary-3.jpg", "calculator-diary-4.jpg", "calculator-diary-4.jpg", "calculator-diary-main.jpg") },
  pen: { kind: "photos", shape: "box", faces: sides("parker-vector-pen-2.jpg", "parker-vector-pen-3.jpg", "parker-vector-pen-4.jpg", "parker-vector-pen-4.jpg", "parker-vector-pen-main.jpg") },
  tile: { kind: "photos", shape: "box", faces: sides("sticky-notes-set-2.webp", "sticky-notes-set-3.webp", "sticky-notes-set-4.webp", "sticky-notes-set-4.webp", "sticky-notes-set-main.webp") },
  brick: { kind: "glb", url: "/e2e-fixtures/cube.glb" },
  small: { kind: "photos", shape: "box", faces: sides("premium-corporate-gift-boxes.jpg", "premium-corporate-gift-boxes.jpg", "premium-corporate-gift-boxes.jpg", "premium-corporate-gift-boxes.jpg", "corporate-gift-hamper.png") },
  large: { kind: "photos", shape: "box", faces: sides("premium-corporate-gift-boxes.jpg", "premium-corporate-gift-boxes.jpg", "premium-corporate-gift-boxes.jpg", "premium-corporate-gift-boxes.jpg", "corporate-gift-hamper.png") },
};

/** Serves the e2e 3D model fixture to the page (the seeded "brick" product uses it). */
async function serveFixtures(page: Page) {
  await page.route("**/e2e-fixtures/cube.glb", (r) =>
    r.fulfill({ body: readFileSync("e2e/fixtures/cube.glb"), contentType: "model/gltf-binary" }));
}

/** Seeded catalogue for the shopper tests: the fixture's boxes and items as real products (prices in rupees). */
type SeedItem = { productId: string; lengthMm: number; breadthMm: number; heightMm: number; weightG: number; orientation?: string; fragile?: boolean };
type Seed =
  | { key: string; name: string; price: number; box: { lengthMm: number; breadthMm: number; heightMm: number; maxLoadG: number }; tare: number }
  | { key: string; name: string; price: number; item: SeedItem; image?: string };
const SEED: Seed[] = [
  { key: "small", name: "E2E Small hamper box", price: 300, box: fx.boxes.small, tare: 250 },
  { key: "large", name: "E2E Large hamper box", price: 600, box: fx.boxes.large, tare: 500 },
  ...(["mug", "notebook", "bottle", "heavy", "pen", "jar", "tile", "brick"] as const).map((k, i) => ({
    key: k, name: `E2E ${k[0].toUpperCase()}${k.slice(1)}`, price: 100 + i * 50, item: fx.items[k], image: SEED_IMAGES[k],
  })),
  // Has a size but no 2D photo or 3D model yet: the admin completes it in step 6.
  { key: "plain", name: "E2E Plain", price: 120, item: { productId: "plain", lengthMm: 120, breadthMm: 80, heightMm: 60, weightG: 300 }, image: undefined },
];
const seedId = (key: string) => `e2e-hb-${key}`;

async function seedCatalogue() {
  const [t] = await sql`select category_slug, division, budget_band from products where active order by sort_order limit 1`;
  for (const [i, s] of SEED.entries()) {
    const d = "box" in s ? s.box : s.item;
    const it: SeedItem | null = "item" in s ? s.item : null;
    await sql`insert into products (id, sku, slug, name, division, budget_band, category_slug, price_paise, active, sort_order, content,
                length_mm, breadth_mm, height_mm, weight_g, max_load_g, packing_kind, orientation, fragile)
              values (${seedId(s.key)}, ${`E2E-HB-${i}`}, ${seedId(s.key)}, ${s.name}, ${t.division}, ${t.budget_band}, ${t.category_slug},
                ${s.price * 100}, true, 5, ${sql.json({ description: "e2e hamper seed", images: "image" in s && s.image ? [s.image] : [],
                  ...(SEED_MODELS[s.key] ? { model3d: SEED_MODELS[s.key] } : {}),
                  ...("image" in s && s.image ? { hamperImage: s.image } : {}) } as never)},
                ${d.lengthMm}, ${d.breadthMm}, ${d.heightMm}, ${"box" in s ? s.tare : it!.weightG}, ${"box" in s ? s.box.maxLoadG : null},
                ${"box" in s ? "hamper_box" : "item"}, ${it?.orientation ?? "any"}, ${!!it?.fragile})
              on conflict (id) do update set content = excluded.content`;
  }
  await fetch(`${E2E_BASE_URL}/revalidate`, { method: "POST", headers: { "x-revalidate-secret": E2E_REVALIDATE_SECRET } });
}

async function openBuilder(page: Page, box: "Small" | "Large") {
  await serveFixtures(page);
  await page.goto("/hampers/build");
  await page.getByRole("radio", { name: new RegExp(`E2E ${box} hamper box`) }).click();
  await page.getByLabel("Search hamper products").fill("E2E");
}

const card = (page: Page, name: string) => page.getByRole("list", { name: "Products" }).getByRole("listitem").filter({ hasText: name });

async function adminApp(page: Page, path: string) {
  await page.goto(adminUrl(path));
  if (await page.getByLabel("Email or mobile").isVisible().catch(() => false)) {
    await page.getByLabel("Email or mobile").fill("admin@hspmart.test");
    await page.getByRole("button", { name: "Send code" }).click();
    const code = (await page.getByTestId("dev-code").textContent())!.replace(/\D/g, "");
    await page.getByLabel(/Code sent/).fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
}

async function openProduct(page: Page, slug: string, name: string) {
  await adminApp(page, "/products");
  await page.getByLabel("Search products").fill(slug);
  await page.getByTestId("products-table").getByRole("link", { name }).click();
}

// The dev server compiles each page on first visit; warm the sign-in path so the first test does not race it.
test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await browser.newPage();
  for (const path of ["/login", "/admin", "/hampers/build"]) await page.goto(path).catch(() => {});
  await page.close();
});

// Leave the shared test database as we found it: later specs count products and pick "the first" one.
test.afterAll(async () => {
  const ids = SEED.map((s) => seedId(s.key));
  const orders = sql`select distinct order_id from order_lines where product_id in ${sql(ids)}`;
  for (const t of ["commission_ledger", "payments", "shipments", "order_lines"]) {
    await sql`delete from ${sql(t)} where order_id in (${orders})`;
  }
  await sql`delete from orders o where not exists (select 1 from order_lines l where l.order_id = o.id)
            and o.client_ref is not null and exists (select 1 from customers c where c.id = o.customer_id and c.email like 'hamper.%')`;
  await sql`delete from wishlist_items where product_id in ${sql(ids)}`;
  await sql`delete from products where id in ${sql(ids)}`;
  await fetch(`${E2E_BASE_URL}/revalidate`, { method: "POST", headers: { "x-revalidate-secret": E2E_REVALIDATE_SECRET } }).catch(() => {});
});

test.describe("Step 1 · size and weight in the admin", () => {
  let product: { id: string; slug: string; name: string };
  test.beforeAll(async () => {
    [product] = (await sql`select id, slug, name from products where active order by sort_order offset 3 limit 1`) as unknown as (typeof product)[];
  });
  test.afterAll(async () => {
    await sql`update products set length_mm = null, breadth_mm = null, height_mm = null, weight_g = null, max_load_g = null,
              packing_kind = 'item', orientation = 'any', fragile = false where id = ${product.id}`;
  });

  test("HB-1.1 admin saves a product's size and weight and it reaches the API", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, product.slug, product.name);
    await page.getByLabel("Length (mm)").fill("180");
    await page.getByLabel("Breadth (mm)").fill("80");
    await page.getByLabel("Height (mm)").fill("60");
    await page.getByLabel("Weight (g)").fill("350");
    await page.getByLabel("Keep upright (this way up)").check();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("live on the store");

    await page.reload();
    await expect(page.getByLabel("Length (mm)")).toHaveValue("180");
    await expect(page.getByLabel("Weight (g)")).toHaveValue("350");
    await expect(page.getByLabel("Keep upright (this way up)")).toBeChecked();
    const res = await page.request.get("/api/site-data");
    const p = (await res.json()).products.find((x: { id: string }) => x.id === product.id);
    expect(p.dimensions).toEqual({ lengthMm: 180, breadthMm: 80, heightMm: 60 });
    expect(p.weightG).toBe(350);
    expect(p.orientation).toBe("upright");
    await ctx.close();
  });

  test("HB-1.2 a hamper box without a maximum load is refused", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, product.slug, product.name);
    await page.getByLabel("This is a hamper box (products are packed inside it)").check();
    await expect(page.getByLabel("Maximum load (g)")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("alert")).toContainText("maximum load");
    const [row] = await sql`select packing_kind from products where id = ${product.id}`;
    expect(row.packing_kind).toBe("item");
    await ctx.close();
  });

  test("HB-1.3 out-of-range sizes are refused", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, product.slug, product.name);
    await page.getByLabel("Height (mm)").fill("3000");
    // Bypass the browser's own max check so the server rule is what's tested.
    await page.locator("form").evaluate((f) => f.setAttribute("novalidate", ""));
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("alert")).toContainText("Height must be a whole number from 1 to 2000 mm");
    await ctx.close();
  });

  test("HB-1.4 the ISO 3394 picker fills length and breadth, and a box saves with its load", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, product.slug, product.name);
    await page.getByLabel("This is a hamper box (products are packed inside it)").check();
    await page.getByLabel("ISO 3394 box footprint").selectOption("300x200");
    await expect(page.getByLabel("Length (mm)")).toHaveValue("300");
    await expect(page.getByLabel("Breadth (mm)")).toHaveValue("200");
    await page.getByLabel("Height (mm)").fill("150");
    await page.getByLabel("Maximum load (g)").fill("3000");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("live on the store");
    const [row] = await sql`select packing_kind, length_mm, breadth_mm, height_mm, max_load_g from products where id = ${product.id}`;
    expect(row).toMatchObject({ packing_kind: "hamper_box", length_mm: 300, breadth_mm: 200, height_mm: 150, max_load_g: 3000 });
    await ctx.close();
  });
});

test.describe("Step 2 · fit check while shopping", () => {
  test.beforeAll(seedCatalogue);

  test("HB-2.1 an item taller than the box is disabled with the reason", async ({ page }) => {
    await openBuilder(page, "Small");
    await expect(card(page, "E2E Bottle")).toContainText("Too tall for this box");
    await expect(page.getByRole("button", { name: "Add E2E Bottle" })).toBeDisabled();
    // The large box is tall enough.
    await page.getByRole("radio", { name: /E2E Large hamper box/ }).click();
    await expect(page.getByRole("button", { name: "Add E2E Bottle" })).toBeEnabled();
  });

  test("HB-2.2 the weight limit stops further adds", async ({ page }) => {
    await openBuilder(page, "Small");
    await page.getByRole("button", { name: "Add E2E Heavy" }).click();
    await expect(page.getByTestId("fill-meter")).toContainText("1.2 kg of 2.0 kg");
    await expect(card(page, "E2E Heavy")).toContainText("Over the box's weight limit");
    await expect(page.getByRole("button", { name: "Add E2E Heavy" })).toBeDisabled();
  });

  test("HB-2.3 the meter shows space and weight used from the fixture", async ({ page }) => {
    await openBuilder(page, "Small");
    await page.getByRole("button", { name: "Add E2E Notebook" }).click();
    await page.getByRole("button", { name: "Add E2E Pen" }).click();
    await expect(page.getByTestId("fill-meter")).toContainText("16 % full · 0.32 kg of 2.0 kg");
    await expect(page.getByRole("meter", { name: "Space used" })).toHaveAttribute("aria-valuenow", "16");
    // A mug cannot share the small box with the notebook (fixture case mug-and-notebook-do-not-share).
    await expect(card(page, "E2E Mug")).toContainText("Won't fit with what's already inside");
    await expect(page.getByRole("list", { name: "Hamper contents" })).toContainText("E2E Notebook × 1");
  });
});

type Box3 = { x: number; y: number; z: number; l: number; b: number; h: number; product: string };
async function placements(page: Page): Promise<Box3[]> {
  return page.getByRole("table", { name: "Packing plan" }).locator("tbody tr").evaluateAll((rows) =>
    rows.map((r) => {
      const d = (r as HTMLElement).dataset;
      return { x: +d.x!, y: +d.y!, z: +d.z!, l: +d.l!, b: +d.b!, h: +d.h!, product: d.product! };
    }),
  );
}

test.describe("Step 3 · packing plan", () => {
  test.beforeAll(seedCatalogue);

  test("HB-3.1 four items are placed inside the box without overlapping", async ({ page }) => {
    await openBuilder(page, "Large");
    for (const n of ["Brick", "Mug", "Notebook", "Tile"]) await page.getByRole("button", { name: `Add E2E ${n}` }).click();
    await expect(page.getByText("Packing plan (4 items)")).toBeVisible();
    const ps = await placements(page);
    expect(ps).toHaveLength(4);
    const [L, B, H] = [380, 280, 180]; // 400 × 300 × 200 less 10 mm padding each side
    const o = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 0;
    for (const [i, p] of ps.entries()) {
      expect(p.x + p.l <= L && p.y + p.b <= B && p.z + p.h <= H && p.x >= 0 && p.y >= 0 && p.z >= 0).toBe(true);
      for (const q of ps.slice(i + 1)) {
        expect(o(p.x, p.x + p.l, q.x, q.x + q.l) && o(p.y, p.y + p.b, q.y, q.y + q.b) && o(p.z, p.z + p.h, q.z, q.z + q.h)).toBe(false);
      }
    }
  });

  test("HB-3.2 an upright item keeps its height vertical and nothing rests on a fragile one", async ({ page }) => {
    await openBuilder(page, "Large");
    for (const n of ["Bottle", "Jar", "Notebook", "Pen"]) await page.getByRole("button", { name: `Add E2E ${n}` }).click();
    const ps = await placements(page);
    const bottle = ps.find((p) => p.product === "e2e-hb-bottle")!;
    expect(bottle.h).toBe(fx.items.bottle.heightMm);
    const jar = ps.find((p) => p.product === "e2e-hb-jar")!;
    expect(jar.h).toBe(fx.items.jar.heightMm);
    const onJar = ps.filter((q) => q.z === jar.z + jar.h && q.x < jar.x + jar.l && q.x + q.l > jar.x && q.y < jar.y + jar.b && q.y + q.b > jar.y);
    expect(onJar).toEqual([]);
  });
});

async function fillLarge(page: Page) {
  await openBuilder(page, "Large");
  for (const n of ["Brick", "Mug", "Notebook", "Jar"]) await page.getByRole("button", { name: `Add E2E ${n}` }).click();
}

/** Distinct colours in a downscaled copy of the 3D canvas: a blank or failed render has only one or two. */
async function canvasColours(page: Page) {
  return page.getByTestId("hamper-3d-canvas").evaluate(async (c: HTMLCanvasElement) => {
    const img = new Image();
    img.src = c.toDataURL();
    await img.decode();
    const s = document.createElement("canvas");
    s.width = 64; s.height = 42;
    const ctx = s.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 64, 42);
    const d = ctx.getImageData(0, 0, 64, 42).data;
    const set = new Set<number>();
    for (let i = 0; i < d.length; i += 4) set.add(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
    return set.size;
  });
}

test.describe("Step 4 · 2D and 3D preview", () => {
  test.beforeAll(seedCatalogue);

  test("HB-4.1 the 2D view shows top and front views of the box to scale", async ({ page }) => {
    await fillLarge(page);
    const preview = page.getByTestId("preview-2d");
    // Rendered from the same 3D scene as the 3D tab.
    await expect(preview).toHaveAttribute("data-rendered", "true", { timeout: 20_000 });
    await expect(preview).toHaveAttribute("data-items", "4");
    await expect(preview.getByRole("img", { name: /Top view of the hamper, 400 × 300 mm, 4 items/ })).toBeVisible();
    await expect(preview.getByRole("img", { name: /Front view of the hamper, 400 × 200 mm, 4 items/ })).toBeVisible();
    await expect(page.getByText("outside 400 × 300 × 200 mm")).toBeVisible();
    await page.getByTestId("preview-section").screenshot({ path: "test-results/hamper-2d.png" });
  });

  test("HB-4.2 the 3D view renders the packed box and turns when dragged", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); // no auto-rotate, so only the drag changes the picture
    await fillLarge(page);
    await page.getByRole("tab", { name: "3D" }).click();
    const host = page.getByTestId("preview-3d");
    await expect(host).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
    await expect(host).toHaveAttribute("data-items", "4");
    await expect(page.getByRole("img", { name: /3D view of the hamper with 4 items/ })).toBeVisible();
    await expect.poll(() => canvasColours(page)).toBeGreaterThan(20);
    await testInfo.attach("3d-preview", { body: await page.getByTestId("preview-section").screenshot(), contentType: "image/png" });
    await page.getByTestId("preview-section").screenshot({ path: "test-results/hamper-3d.png" });
    const before = await page.getByTestId("hamper-3d-canvas").evaluate((c: HTMLCanvasElement) => c.toDataURL());
    const b = (await host.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 160, b.y + b.height / 2 + 20, { steps: 8 });
    await page.mouse.up();
    await expect.poll(() => page.getByTestId("hamper-3d-canvas").evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
    await page.getByLabel("Close the lid").check();
    await expect(page.getByLabel("Close the lid")).toBeChecked();
  });

  test("HB-4.3 without WebGL the 3D tab falls back to the 2D view", async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
      (HTMLCanvasElement.prototype as unknown as { getContext: typeof orig }).getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : orig.call(this, type, ...rest);
      };
    });
    await fillLarge(page);
    await page.getByRole("tab", { name: "3D" }).click();
    await expect(page.getByRole("status").filter({ hasText: "3D isn't available in this browser" })).toBeVisible();
    await expect(page.getByTestId("preview-2d")).toBeVisible();
  });
});

async function fillCheckout(page: Page, email: string) {
  await page.locator("#checkout-full-name").fill("Asha Verma");
  await page.locator("#checkout-email").fill(email);
  await page.locator("#checkout-phone").fill("9876543210");
  await page.locator("#checkout-line1").fill("12 MG Road");
  await page.locator("#checkout-city").fill("Pune");
  await page.locator("#checkout-state").selectOption("Maharashtra");
  await page.locator("#checkout-pincode").fill("411001");
  await page.locator('input[name="paymentMethod"][value="upi"]').check({ force: true });
}

async function buildSmallNotebookPen(page: Page) {
  await openBuilder(page, "Small");
  await page.getByRole("button", { name: "Add E2E Notebook" }).click();
  await page.getByRole("button", { name: "Add E2E Pen" }).click();
  await expect(page.getByTestId("hamper-total")).toContainText("Total ₹750"); // box 300 + notebook 150 + pen 300
  await page.getByRole("button", { name: "Add hamper to cart" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Hamper added" })).toBeVisible();
}

test.describe.serial("Step 5 · cart, checkout and server checks", () => {
  const email = uniqueEmail("hamper");
  let orderNo = "";
  test.beforeAll(seedCatalogue);

  test("HB-5.1 a built hamper goes to the cart as box plus contents at the summed price", async ({ page }) => {
    await buildSmallNotebookPen(page);
    await page.getByRole("link", { name: "View cart" }).click();
    const line = page.getByRole("main").getByRole("listitem").filter({ hasText: "E2E Small hamper box" }).first();
    await expect(line).toContainText("E2E Notebook");
    await expect(line).toContainText("E2E Pen");
    await expect(line).toContainText("₹750");
  });

  test("HB-5.2 switching to a smaller box lists what won't fit and removes it on confirm", async ({ page }) => {
    await openBuilder(page, "Large");
    for (const n of ["Bottle", "Notebook", "Pen"]) await page.getByRole("button", { name: `Add E2E ${n}` }).click();
    await page.getByRole("radio", { name: /E2E Small hamper box/ }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Some items won't fit in E2E Small hamper box");
    await expect(dialog.getByRole("list", { name: "Items that will be removed" })).toHaveText("E2E Bottle");
    await dialog.getByRole("button", { name: "Keep my current box" }).click();
    await expect(page.getByRole("radio", { name: /E2E Large hamper box/ })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("radio", { name: /E2E Small hamper box/ }).click();
    await page.getByRole("button", { name: "Switch and remove them" }).click();
    await expect(page.getByRole("radio", { name: /E2E Small hamper box/ })).toHaveAttribute("aria-checked", "true");
    const contents = page.getByRole("list", { name: "Hamper contents" });
    await expect(contents).not.toContainText("E2E Bottle");
    await expect(contents).toContainText("E2E Notebook × 1");
  });

  test("HB-5.3 a tampered hamper is refused by the server", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, email);
    const res = await page.request.post("/api/checkout", {
      data: {
        clientRef: `tamper${Date.now()}`,
        customer: { fullName: "T", email, phone: "9876543210" },
        address: { line1: "1", city: "Pune", state: "MH", pincode: "411001" },
        items: [{ productId: seedId("small"), quantity: 1, hamper: { contents: [{ productId: seedId("heavy"), quantity: 2 }] } }],
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).detail).toContain("over the weight limit");
    await ctx.close();
  });

  test("HB-5.4 checkout prices each product and the warehouse sees the parcel weight", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, email);
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("hsp-mart-cart", "[]"));
    await buildSmallNotebookPen(page);
    await page.goto("/checkout");
    await fillCheckout(page, email);
    await page.getByRole("button", { name: "Place order & pay" }).last().click();
    await expect(page).toHaveURL(/\/my\/orders\/O-.*pay=1/);
    orderNo = page.url().split("/").pop()!.split("?")[0];
    const lines = await sql`select l.product_id, l.quantity, l.unit_price_paise from order_lines l join orders o on o.id = l.order_id
                            where o.number = ${orderNo} order by l.product_id`;
    expect(lines.map((l) => [l.product_id, l.quantity, Number(l.unit_price_paise)])).toEqual([
      [seedId("notebook"), 1, 15000], [seedId("pen"), 1, 30000], [seedId("small"), 1, 30000],
    ]);
    const [o] = await sql`select subtotal_paise from orders where number = ${orderNo}`;
    expect(Number(o.subtotal_paise)).toBe(75000);
    await ctx.close();

    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    // 25 × 20 × 12 cm box: actual 0.25 + 0.3 + 0.02 = 0.57 kg; volumetric 6000 / 5000 = 1.2 kg, which is billed.
    await expect(admin.page.getByTestId("parcel")).toHaveText("Parcel 25 × 20 × 12 cm · actual 0.57 kg · volumetric 1.2 kg · billed 1.2 kg");
    await admin.ctx.close();
  });

  test("HB-5.5 the builder works from the keyboard and has no serious accessibility problems", async ({ page }) => {
    await page.goto("/hampers/build");
    await page.getByRole("radio", { name: /E2E Large hamper box/ }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Search hamper products").focus();
    await page.keyboard.type("E2E Mug");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Add E2E Mug" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("list", { name: "Hamper contents" })).toContainText("E2E Mug × 1");
    await page.getByRole("tab", { name: "3D" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tab", { name: "3D" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Add hamper to cart" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Hamper added" })).toBeVisible();

    const results = await new AxeBuilder({ page }).include("#main-content").withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

const PHOTO = "public/images/products/hans-writing-pad.jpg";

test.describe.serial("Step 6 · a 3D model for every product, entered by the admin", () => {
  test.beforeAll(seedCatalogue);

  test("HB-6.6 checkout refuses a hamper with a product that has no 3D model", async ({ browser }) => {
    const email = uniqueEmail("model");
    const { ctx, page } = await asUser(browser, email);
    const res = await page.request.post("/api/checkout", {
      data: {
        clientRef: `nomodel${Date.now()}`, customer: { fullName: "T", email, phone: "9876543210" },
        address: { line1: "1", city: "Pune", state: "MH", pincode: "411001" },
        items: [{ productId: seedId("large"), quantity: 1, hamper: { contents: [{ productId: seedId("plain"), quantity: 1 }] } }],
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).detail).toContain("cannot go in a hamper");
    await ctx.close();
  });

  test("HB-6.3 a missing side photo is listed and keeps the product out of the builder", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, seedId("plain"), "E2E Plain");
    const status = page.getByTestId("hamper-readiness");
    await expect(status).toHaveText("Not in the hamper builder yet. Missing: 3D model, 2D photo.");
    await page.getByLabel("Upload 2D photo").setInputFiles(PHOTO);
    for (const f of ["front", "back", "left", "right", "bottom"]) {
      await page.getByLabel(`Upload ${f} photo`).setInputFiles(PHOTO);
      await expect(page.getByRole("img", { name: new RegExp(`^${f === "left" || f === "right" ? `${f[0].toUpperCase()}${f.slice(1)} side` : `${f[0].toUpperCase()}${f.slice(1)}`} photo$`) })).toBeVisible();
    }
    await expect(status).toHaveText("Not in the hamper builder yet. Missing: top photo.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "live on the store" })).toBeVisible();

    const shop = await browser.newPage();
    await openBuilder(shop, "Large");
    await expect(card(shop, "E2E Mug")).toBeVisible();
    await expect(card(shop, "E2E Plain")).toHaveCount(0);
    await shop.close();
    await ctx.close();
  });

  test("HB-6.1 with every side photographed the portal builds the 3D model and the product is offered", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, seedId("plain"), "E2E Plain");
    await page.getByLabel("Upload top photo").setInputFiles(PHOTO);
    await expect(page.getByTestId("hamper-readiness")).toHaveText("Ready for the hamper builder.");
    const preview = page.getByTestId("model3d-preview");
    await expect(preview).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
    await expect(preview).toHaveAttribute("data-model", "photos");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "live on the store" })).toBeVisible();
    const [row] = await sql`select content from products where id = ${seedId("plain")}`;
    expect(Object.keys(row.content.model3d.faces).sort()).toEqual(["back", "bottom", "front", "left", "right", "top"]);
    expect(row.content.model3d.faces.top).toMatch(/^\/api\/media\//);
    // Uploaded photos are public.
    expect((await page.request.get(row.content.model3d.faces.top)).headers()["content-type"]).toBe("image/jpeg");

    const shop = await browser.newPage();
    await openBuilder(shop, "Large");
    await expect(card(shop, "E2E Plain")).toBeVisible();
    await shop.close();
    await ctx.close();
  });

  test("HB-6.2 a .glb model can be uploaded instead; anything else is refused", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await openProduct(page, seedId("plain"), "E2E Plain");
    await page.getByLabel("Upload a 3D model file (.glb)").check();
    await page.getByLabel("Upload 3D model file").setInputFiles("e2e/fixtures/not-a-model.glb");
    await expect(page.getByRole("alert")).toContainText("Upload a PNG, JPEG or WebP photo, or a .glb 3D model.");
    await page.getByLabel("Upload 3D model file").setInputFiles("e2e/fixtures/cube.glb");
    const preview = page.getByTestId("model3d-preview");
    await expect(preview).toHaveAttribute("data-model", "glb");
    await expect(preview).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
    await expect(page.getByTestId("hamper-readiness")).toHaveText("Ready for the hamper builder.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "live on the store" })).toBeVisible();
    const [row] = await sql`select content from products where id = ${seedId("plain")}`;
    expect(row.content.model3d.kind).toBe("glb");
    await ctx.close();
  });

  test("HB-6.4 / 6.5 the 3D and 2D previews draw every item from its own model", async ({ page }) => {
    await openBuilder(page, "Large");
    for (const n of ["Brick", "Mug", "Notebook"]) await page.getByRole("button", { name: `Add E2E ${n}` }).click();
    const flat = page.getByTestId("preview-2d");
    await expect(flat).toHaveAttribute("data-rendered", "true", { timeout: 20_000 });
    await expect(flat).toHaveAttribute("data-items", "3");
    await page.getByTestId("preview-section").screenshot({ path: "test-results/hamper-6-2d.png" });
    await page.getByRole("tab", { name: "3D" }).click();
    const host = page.getByTestId("preview-3d");
    await expect(host).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
    await expect(host).toHaveAttribute("data-items", "3");
    const models = (await host.getAttribute("data-models"))!.split(",").sort();
    expect(models).toEqual(["glb", "photos", "photos"]);
    await page.waitForTimeout(1500);
    await page.getByTestId("preview-section").screenshot({ path: "test-results/hamper-6-3d.png" });
  });
});
