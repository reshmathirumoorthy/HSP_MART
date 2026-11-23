/**
 * Phase 2 — Commerce core: pricing engine, quote workflow with margin exceptions,
 * orders, Razorpay webhooks (signed + idempotent), supplier POs, fulfilment, reconciliation.
 */
import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { seedProducts as catalogue } from "../scripts/db/seed-data/products";
import { priceQuote } from "../src/lib/commerce/pricing";
import { E2E_WEBHOOK_SECRET } from "../playwright.config";
import { adminUrl, asUser, expectNotice, expectProblem, sql, uniqueEmail } from "./helpers";

/* ── 2.1 pricing engine (pure) ─────────────────────────── */

test.describe("2.1 pricing engine", () => {
  const line = { productId: "p", quantity: 1, unitPricePaise: 100_000, unitCostPaise: 70_000, gstRateBps: 1800 };

  test("reproduces the Blueprint page-5 channel table (70% cost, 7% variable)", () => {
    const associate = priceQuote({ lines: [line], channel: "associate", partner: { commissionBps: 1000, serviceFeeBps: 0 } });
    const franchise = priceQuote({ lines: [line], channel: "franchise", partner: { commissionBps: 1000, serviceFeeBps: 200 } });
    const direct = priceQuote({ lines: [line], channel: "direct", partner: null });
    expect([associate.contributionBps, franchise.contributionBps, direct.contributionBps]).toEqual([1300, 1100, 2300]);
    expect([associate.belowMinimum, franchise.belowMinimum, direct.belowMinimum]).toEqual([false, true, false]);
    expect(associate.commissionPaise).toBe(10_000); // ₹1,00,000 × 10% example scaled
  });

  test("commission base excludes GST and freight; GST applies to freight", () => {
    const r = priceQuote({ lines: [line], freightPaise: 5_000, channel: "associate", partner: { commissionBps: 1000, serviceFeeBps: 0 } });
    expect(r.subtotalPaise).toBe(100_000);
    expect(r.gstPaise).toBe(18_000 + 900);
    expect(r.totalPaise).toBe(100_000 + 5_000 + 18_900);
    expect(r.commissionPaise).toBe(10_000);
  });

  test("unknown cost is estimated at 70% and flagged; invalid input throws", () => {
    const r = priceQuote({ lines: [{ ...line, unitCostPaise: null }], channel: "direct", partner: null });
    expect(r.costPaise).toBe(70_000);
    expect(r.anyCostEstimated).toBe(true);
    expect(() => priceQuote({ lines: [{ ...line, quantity: 0 }], channel: "direct", partner: null })).toThrow();
    expect(() => priceQuote({ lines: [line], channel: "associate", partner: null })).toThrow(/partner/);
  });
});

/* ── helpers ───────────────────────────────────────────── */

const sellable = catalogue.filter((p) => p.price >= 200 && (p.minOrderQuantity ?? 1) <= 5 && p.active !== false);
const A = sellable[0];
const B = sellable[1];
const paise = (r: number) => Math.round(r * 100);

let evtSeq = 0;
async function webhook(
  request: APIRequestContext,
  body: object,
  { secret = E2E_WEBHOOK_SECRET, eventId = `evt_e2e_${Date.now()}_${evtSeq++}` } = {},
) {
  const raw = JSON.stringify(body);
  const sig = createHmac("sha256", secret).update(raw).digest("hex");
  const res = await request.post("/api/webhooks/razorpay", {
    data: raw,
    headers: { "content-type": "application/json", "x-razorpay-signature": sig, "x-razorpay-event-id": eventId },
  });
  return { res, eventId };
}
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const captured = (orderId: string, amount: number, payId = `pay_${orderId.slice(-8)}_${amount}`) => ({
  event: "payment.captured",
  payload: { payment: { entity: { id: payId, order_id: orderId, amount, status: "captured" } } },
});

async function createQuote(page: Page, customerEmail: string, lines: string, name = "Acme Industries Pvt Ltd") {
  await page.goto(adminUrl("/quotes"));
  await page.getByLabel("Customer name").fill(name);
  await page.getByLabel("Customer email").fill(customerEmail);
  await page.getByLabel(/^Lines/).fill(lines);
  await page.getByRole("button", { name: "Create quote" }).click();
  await expect(page).toHaveURL(/\/quotes\/Q-/);
  return page.url().split("/").pop()!.split("?")[0];
}

/* ── 2.2–2.5 end-to-end quote-to-cash ──────────────────── */

test.describe.serial("2.2–2.5 quote → order → payment → PO → delivery → close", () => {
  const customerEmail = uniqueEmail("buyer");
  let quoteNo = "";
  let orderNo = "";

  test("procurement onboards an approved supplier with rates (finance cannot approve)", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl("/suppliers"));
    await admin.page.getByLabel("Supplier name").fill("Sharma Gift Works");
    await admin.page.getByLabel("City").fill("Mumbai");
    await admin.page.getByRole("button", { name: "Add (pending approval)" }).click();
    await expectNotice(admin.page, "Supplier added");

    const card = admin.page.getByTestId("supplier-Sharma Gift Works");
    for (const p of [A, B]) {
      await card.getByLabel("Rate SKU").fill(p.sku);
      await card.getByLabel("Rate cost").fill(String(Math.round(p.price * 0.6)));
      await card.getByLabel("Lead time").fill("5");
      await card.getByRole("button", { name: "Save rate" }).click();
      await expectNotice(admin.page, "Rate saved");
    }

    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto(adminUrl("/suppliers"));
    await finance.page.getByTestId("supplier-Sharma Gift Works").getByRole("button", { name: "Approve" }).click();
    await expectProblem(finance.page, "Only procurement");

    const proc = await asUser(browser, "procurement@hspmart.test");
    await proc.page.goto(adminUrl("/suppliers"));
    await proc.page.getByTestId("supplier-Sharma Gift Works").getByRole("button", { name: "Approve" }).click();
    await expectNotice(proc.page, "Supplier approved");
    await Promise.all([admin.ctx.close(), finance.ctx.close(), proc.ctx.close()]);
  });

  test("admin creates a branded direct quote; engine uses supplier cost and DB prices", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    quoteNo = await createQuote(page, customerEmail, `${A.sku}, 5, , Logo print on lid\n${B.sku}, 5`);
    await expect(page.getByTestId("quote-status")).toHaveText("approved");
    const sub = (paise(A.price) + paise(B.price)) * 5;
    const [q] = await sql`select subtotal_paise, contribution_bps, below_minimum from quotations where number = ${quoteNo}`;
    expect(Number(q.subtotal_paise)).toBe(sub);
    expect(q.below_minimum).toBe(false);
    expect(q.contribution_bps).toBeGreaterThanOrEqual(3200); // 100 − 60 cost − 7 variable ≈ 33%
    await ctx.close();
  });

  test("unknown SKUs and bad lines are rejected with a clear error", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, "admin@hspmart.test");
    await page.goto(adminUrl("/quotes"));
    await page.getByLabel("Customer name").fill("X");
    await page.getByLabel("Customer email").fill("x@x.test");
    await page.getByLabel(/^Lines/).fill("NOT-A-SKU, 3");
    await page.getByRole("button", { name: "Create quote" }).click();
    await expectProblem(page, "Unknown or inactive SKU");
    await ctx.close();
  });

  test("customers cannot see a quote before it is sent", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, customerEmail);
    const res = await page.goto(`/my/quotes/${quoteNo}`);
    expect(res?.status()).toBe(404);
    await ctx.close();
  });

  test("below-minimum quote needs an exception approved by someone other than its creator", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    const discounted = Math.round(A.price * 0.7);
    const lowNo = await createQuote(admin.page, uniqueEmail("discount"), `${A.sku}, 5, ${discounted}`);
    await expect(admin.page.getByTestId("quote-status")).toHaveText("pending approval");
    await expect(admin.page.getByTestId("below-minimum")).toBeVisible();
    await expect(admin.page.getByRole("button", { name: "Send to customer" })).toHaveCount(0);

    await admin.page.getByLabel("Exception reason").fill("Strategic first order for new logo account");
    await admin.page.getByRole("button", { name: "Approve exception" }).click();
    await expectProblem(admin.page, "cannot approve its own");

    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto(adminUrl(`/quotes/${lowNo}`));
    await finance.page.getByLabel("Exception reason").fill("short");
    await finance.page.getByRole("button", { name: "Approve exception" }).click();
    await expectProblem(finance.page, "at least 10");
    await finance.page.getByLabel("Exception reason").fill("Strategic first order for new logo account");
    await finance.page.getByRole("button", { name: "Approve exception" }).click();
    await expect(finance.page.getByTestId("quote-status")).toHaveText("approved");
    const [q] = await sql`select exception_reason, approved_by is not null as ok from quotations where number = ${lowNo}`;
    expect(q.ok).toBe(true);
    await Promise.all([admin.ctx.close(), finance.ctx.close()]);
  });

  test("admin sends; another customer gets 404; the buyer accepts and an order is created", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/quotes/${quoteNo}`));
    await admin.page.getByRole("button", { name: "Send to customer" }).click();
    await expect(admin.page.getByTestId("quote-status")).toHaveText("sent");

    const stranger = await asUser(browser, uniqueEmail("stranger"));
    expect((await stranger.page.goto(`/my/quotes/${quoteNo}`))?.status()).toBe(404);

    const buyer = await asUser(browser, customerEmail);
    await buyer.page.goto(`/my/quotes/${quoteNo}`);
    await buyer.page.getByRole("button", { name: "Accept quotation" }).click();
    await expect(buyer.page).toHaveURL(/\/my\/orders\/O-/);
    orderNo = buyer.page.url().split("/").pop()!.split("?")[0];
    await expect(buyer.page.getByTestId("customer-order-status")).toHaveText("awaiting_artwork");

    // A second accept must not create a second order.
    await buyer.page.goto(`/my/quotes/${quoteNo}`);
    await expect(buyer.page.getByRole("button", { name: "Accept quotation" })).toHaveCount(0);
    const [{ n }] = await sql`select count(*)::int n from orders o join quotations q on q.id = o.quotation_id where q.number = ${quoteNo}`;
    expect(n).toBe(1);
    await Promise.all([admin.ctx.close(), stranger.ctx.close(), buyer.ctx.close()]);
  });

  test("production is blocked until the 50% advance is captured via a verified webhook", async ({ browser, request }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await admin.page.getByRole("button", { name: /start production/ }).click();
    await expectProblem(admin.page, "advance");

    const buyer = await asUser(browser, customerEmail);
    await buyer.page.goto(`/my/orders/${orderNo}`);
    await buyer.page.getByRole("button", { name: /Pay advance/ }).click();
    const providerOrderId = (await buyer.page.getByTestId("provider-order-id").textContent())!;
    const amount = Number(await buyer.page.getByTestId("pending-amount").textContent());
    const [o] = await sql`select total_paise from orders where number = ${orderNo}`;
    expect(amount).toBe(Math.round(Number(o.total_paise) / 2));

    // Forged signature → rejected
    const forged = await webhook(request, captured(providerOrderId, amount), { secret: "wrong" });
    expect(forged.res.status()).toBe(401);

    // Wrong amount → ignored, nothing credited
    const mismatch = await webhook(request, captured(providerOrderId, amount - 100, "pay_mismatch"));
    expect((await mismatch.res.json()).result).toBe("ignored");

    // Genuine → processed; replay → duplicate; still credited once
    const ok = await webhook(request, captured(providerOrderId, amount));
    expect((await ok.res.json()).result).toBe("processed");
    const replay = await webhook(request, captured(providerOrderId, amount), { eventId: ok.eventId });
    expect((await replay.res.json()).result).toBe("duplicate");
    const again = await webhook(request, captured(providerOrderId, amount));
    expect((await again.res.json()).result).toBe("duplicate");
    const [after] = await sql`select paid_paise from orders where number = ${orderNo}`;
    expect(Number(after.paid_paise)).toBe(amount);

    // Branded order: production also needs uploaded artwork with HSP's written approval.
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await admin.page.getByRole("button", { name: /start production/ }).click();
    await expectProblem(admin.page, "artwork");
    await buyer.page.goto(`/my/orders/${orderNo}`);
    await buyer.page.getByLabel("Artwork file").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await buyer.page.getByRole("button", { name: "Upload artwork" }).click();
    await expect(buyer.page.getByTestId("artwork-row")).toContainText("submitted");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await admin.page.getByRole("button", { name: "Approve artwork & spec" }).click();
    await expect(admin.page.getByTestId("admin-artwork-row")).toContainText("approved");
    await admin.page.getByRole("button", { name: /start production/ }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("production approved");
    await Promise.all([admin.ctx.close(), buyer.ctx.close()]);
  });

  test("PO goes to the approved supplier at supplier cost; dispatch needs full payment", async ({ browser, request }) => {
    const proc = await asUser(browser, "procurement@hspmart.test");
    await proc.page.goto(adminUrl(`/orders/${orderNo}`));
    await proc.page.getByLabel("Supplier").selectOption({ label: "Sharma Gift Works (Mumbai)" });
    await proc.page.getByRole("button", { name: "Issue purchase order" }).click();
    await expect(proc.page.getByTestId("order-status")).toHaveText("po issued");
    const expectedCost = (paise(Math.round(A.price * 0.6)) + paise(Math.round(B.price * 0.6))) * 5;
    await expect(proc.page.getByTestId("po-row")).toContainText("Sharma Gift Works");
    const [po] = await sql`select total_cost_paise from purchase_orders p join orders o on o.id = p.order_id where o.number = ${orderNo}`;
    expect(Number(po.total_cost_paise)).toBe(expectedCost);

    await proc.page.getByLabel("Courier").fill("Blue Dart");
    await proc.page.getByLabel("Tracking number").fill("BD123456789");
    await proc.page.getByRole("button", { name: "Mark dispatched" }).click();
    await expectProblem(proc.page, "Full payment");

    const buyer = await asUser(browser, customerEmail);
    await buyer.page.goto(`/my/orders/${orderNo}`);
    await buyer.page.getByRole("button", { name: /^Pay / }).click();
    const providerOrderId = (await buyer.page.getByTestId("provider-order-id").textContent())!;
    const amount = Number(await buyer.page.getByTestId("pending-amount").textContent());
    expect((await (await webhook(request, captured(providerOrderId, amount))).res.json()).result).toBe("processed");
    await buyer.page.reload();
    await expect(buyer.page.getByTestId("customer-balance")).toContainText("0");

    await proc.page.goto(adminUrl(`/orders/${orderNo}`));
    await proc.page.getByLabel("Courier").fill("Blue Dart");
    await proc.page.getByLabel("Tracking number").fill("BD123456789");
    await proc.page.getByRole("button", { name: "Mark dispatched" }).click();
    await expect(proc.page.getByTestId("order-status")).toHaveText("dispatched");
    await Promise.all([proc.ctx.close(), buyer.ctx.close()]);
  });

  test("delivery needs proof; closing reconciles payments to the paisa and audits every step", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await admin.page.getByRole("button", { name: "Mark delivered" }).click();
    await expectProblem(admin.page, "proof");
    await admin.page.getByLabel("Delivery proof").fill("POD-BD123456789.pdf");
    await admin.page.getByRole("button", { name: "Mark delivered" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("delivered");
    await admin.page.getByRole("button", { name: "Reconcile & close" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("closed");

    const [o] = await sql`select id, paid_paise, total_paise from orders where number = ${orderNo}`;
    expect(Number(o.paid_paise)).toBe(Number(o.total_paise));
    const actions = (await sql`select action from audit_events where entity_id = ${o.id} order by created_at`).map((r) => r.action);
    expect(actions).toEqual(["order.create", "order.artwork_approved", "order.dispatch", "order.deliver", "order.close"]);
    await admin.ctx.close();
  });

  test("unpaid orders can be cancelled; paid ones cannot", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    const email = uniqueEmail("canceller");
    const no = await createQuote(admin.page, email, `${B.sku}, 5`);
    await admin.page.getByRole("button", { name: "Send to customer" }).click();
    const buyer = await asUser(browser, email);
    await buyer.page.goto(`/my/quotes/${no}`);
    await buyer.page.getByRole("button", { name: "Accept quotation" }).click();
    await expect(buyer.page).toHaveURL(/\/my\/orders\//);
    const ord = buyer.page.url().split("/").pop()!.split("?")[0];
    await admin.page.goto(adminUrl(`/orders/${ord}`));
    await admin.page.getByRole("button", { name: "Cancel order" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("cancelled");

    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await expect(admin.page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
    await Promise.all([admin.ctx.close(), buyer.ctx.close()]);
  });
});
