/**
 * Phase 7 — closing the blueprint gaps: storefront checkout on Razorpay, credit notes with partial
 * refunds, renewal commission on contracted accounts, secure file storage, Tally export, notification cron.
 */
import { expect, test, type Page } from "@playwright/test";
import { seedProducts as catalogue } from "../scripts/db/seed-data/products";
import { E2E_CRON_SECRET, E2E_WEBHOOK_SECRET } from "../playwright.config";
import { adminUrl, asUser, createPartner, expectProblem, makeOrder, sql, uniqueEmail, webhookSigner } from "./helpers";

const signed = webhookSigner(E2E_WEBHOOK_SECRET);
const P = catalogue.find((p) => p.active !== false && (p.minOrderQuantity ?? 1) === 1 && p.price >= 300 && p.price <= 900)!;
const pricePaise = Math.round(P.price * 100);

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

const cartWith = (qty: number) =>
  `localStorage.setItem("hsp-mart-cart", ${JSON.stringify(JSON.stringify([{ productId: P.id, quantity: qty }]))})`;

/* ── 7.1 storefront checkout ───────────────────────────── */

test.describe.serial("7.1 storefront checkout creates a real order paid via Razorpay", () => {
  const email = uniqueEmail("shopper");
  let orderNo = "";

  test("guests are sent to sign in; signed-in checkout re-prices on the server", async ({ browser }) => {
    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto("/");
    await guest.evaluate(cartWith(2));
    await guest.goto("/checkout");
    await fillCheckout(guest, email);
    await guest.getByRole("button", { name: "Place order & pay" }).last().click();
    await expect(guest).toHaveURL(/\/login\?next=%2Fcheckout/);
    await guestCtx.close();

    const { ctx, page } = await asUser(browser, email);
    await page.goto("/");
    // A tampered client price is ignored: the browser only sends ids and quantities.
    await page.evaluate(cartWith(2));
    await page.goto("/checkout");
    await fillCheckout(page, email);
    await page.getByRole("button", { name: "Place order & pay" }).last().click();
    await expect(page).toHaveURL(/\/my\/orders\/O-.*pay=1/);
    orderNo = page.url().split("/").pop()!.split("?")[0];

    const subtotal = pricePaise * 2;
    const freight = subtotal >= 99_900 ? 0 : 9_900;
    const gst = Math.round(subtotal * 0.18) + Math.round(freight * 0.18);
    const [o] = await sql`select source, total_paise, freight_paise, shipping_address from orders where number = ${orderNo}`;
    expect(o.source).toBe("online");
    expect(Number(o.freight_paise)).toBe(freight);
    expect(Number(o.total_paise)).toBe(subtotal + freight + gst);
    expect(o.shipping_address.pincode).toBe("411001");
    // Full amount up front, no advance option.
    await expect(page.getByTestId("pending-amount")).toHaveText(String(subtotal + freight + gst));
    await expect(page.getByRole("button", { name: /Pay advance/ })).toHaveCount(0);
    // Cart cleared after placing.
    expect(await page.evaluate(() => localStorage.getItem("hsp-mart-cart"))).toMatch(/^\[\]$|^null$/);
    await ctx.close();
  });

  test("payment arrives by webhook; production then proceeds", async ({ browser, request }) => {
    const [pay] = await sql`select p.provider_order_id, p.amount_paise from payments p join orders o on o.id = p.order_id where o.number = ${orderNo}`;
    expect(
      await signed(request, { event: "payment.captured", payload: { payment: { entity: { id: `pay_on_${orderNo}`, order_id: pay.provider_order_id, amount: Number(pay.amount_paise), status: "captured" } } } }),
    ).toBe("processed");
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await expect(admin.page.getByTestId("order-source")).toContainText("Online");
    await expect(admin.page.getByTestId("ship-to")).toContainText("411001");
    await admin.page.getByRole("button", { name: "Approve production" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("production approved");
    await admin.ctx.close();
  });

  test("a different signed-in user cannot see the order", async ({ browser }) => {
    const other = await asUser(browser, uniqueEmail("other"));
    expect((await other.page.goto(`/my/orders/${orderNo}`))?.status()).toBe(404);
    await other.ctx.close();
  });
});

/* ── 7.2 credit notes & partial refunds ────────────────── */

test.describe.serial("7.2 credit notes: maker-checker, partial refund, commission & reconciliation", () => {
  let orderNo = "";
  let orderId = "";
  const customerEmail = uniqueEmail("returns");

  test.beforeAll(async () => {
    const partner = await createPartner(uniqueEmail("cn-assoc"), "associate");
    const o = await makeOrder({
      customerEmail,
      status: "delivered",
      lines: [{ productId: P.id, quantity: 10, pricePaise }],
      paidFraction: 1,
      partnerId: partner.partnerId,
      deliveredDaysAgo: 1,
    });
    orderNo = o.number;
    orderId = o.id;
    await sql`insert into payments (order_id, provider_order_id, provider_payment_id, amount_paise, status)
              values (${o.id}, ${"order_cn_" + o.number}, ${"pay_cn_" + o.number}, ${o.total}, 'captured')`;
    await sql`insert into commission_ledger (partner_id, order_id, rate_bps, eligible_base_paise, amount_paise, status, note)
              values (${partner.partnerId}, ${o.id}, 1000, ${o.subtotal}, ${o.subtotal / 10}, 'pending', 'Order confirmed')`;
  });

  test("finance raises a 2-unit return with a refund; the maker cannot approve it", async ({ browser }) => {
    const fin = await asUser(browser, "finance@hspmart.test");
    await fin.page.goto(adminUrl(`/orders/${orderNo}`));
    await fin.page.getByLabel(`Credit quantity ${P.sku}`).fill("11");
    await fin.page.getByLabel("Credit reason").fill("Two hampers arrived damaged");
    await fin.page.getByRole("button", { name: "Raise credit note" }).click();
    await expectProblem(fin.page, "can still be credited");

    const value = pricePaise * 2 + Math.round(pricePaise * 2 * 0.18);
    await fin.page.getByLabel(`Credit quantity ${P.sku}`).fill("2");
    await fin.page.getByLabel("Credit reason").fill("Two hampers arrived damaged");
    await fin.page.getByLabel("Refund amount").fill(String(value / 100 + 1));
    await fin.page.getByRole("button", { name: "Raise credit note" }).click();
    await expectProblem(fin.page, "exceed");

    await fin.page.getByLabel(`Credit quantity ${P.sku}`).fill("2");
    await fin.page.getByLabel("Credit reason").fill("Two hampers arrived damaged");
    await fin.page.getByLabel("Refund amount").fill(String(value / 100));
    await fin.page.getByRole("button", { name: "Raise credit note" }).click();
    await expect(fin.page.getByTestId("credit-note-row")).toContainText("draft");

    await fin.page.getByRole("button", { name: "Approve credit note" }).click();
    await expectProblem(fin.page, "cannot approve");
    await fin.ctx.close();
  });

  test("a second approver applies it; refund is requested; closing waits for the refund", async ({ browser, request }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await admin.page.getByRole("button", { name: "Approve credit note" }).click();
    await expect(admin.page.getByTestId("refund-status")).toHaveText("requested");
    const [o] = await sql`select credited_paise, credited_taxable_paise from orders where id = ${orderId}`;
    expect(Number(o.credited_taxable_paise)).toBe(pricePaise * 2);

    // Paid more than now due → cannot reconcile until the refund lands.
    await admin.page.getByRole("button", { name: "Reconcile & close" }).click();
    await expectProblem(admin.page, "reconcile");

    const [cn] = await sql`select number, refund_paise from credit_notes where order_id = ${orderId}`;
    expect(
      await signed(request, {
        event: "refund.processed",
        payload: { refund: { entity: { id: `rfnd_${cn.number}`, payment_id: `pay_cn_${orderNo}`, amount: Number(cn.refund_paise), notes: { credit_note: cn.number } } } },
      }),
    ).toBe("processed");
    await admin.page.reload();
    await expect(admin.page.getByTestId("refund-status")).toHaveText("processed");
    await admin.page.getByRole("button", { name: "Reconcile & close" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("closed");

    // Commission base shrinks by the credited taxable value (8 of 10 units).
    const [l] = await sql`select status, amount_paise - deductions_paise as net from commission_ledger where order_id = ${orderId} order by created_at desc limit 1`;
    expect(l.status).toBe("earned");
    expect(Number(l.net)).toBe(Math.round((pricePaise * 8) / 10));
    await admin.ctx.close();
  });

  test("the customer sees the credit note; Tally and CSV exports include it", async ({ browser }) => {
    const buyer = await asUser(browser, customerEmail);
    await buyer.page.goto(`/my/orders/${orderNo}`);
    await expect(buyer.page.getByTestId("customer-credit-note")).toContainText("damaged");
    await buyer.ctx.close();

    const fin = await asUser(browser, "finance@hspmart.test");
    const tally = await fin.page.request.get("/api/admin/exports/tally");
    expect(tally.status()).toBe(200);
    const xml = await tally.text();
    expect(xml).toContain(`<VOUCHERNUMBER>${orderNo}</VOUCHERNUMBER>`);
    expect(xml).toContain('VCHTYPE="Credit Note"');
    const csv = await (await fin.page.request.get("/api/admin/exports/credit_notes")).text();
    expect(csv).toContain(orderNo);
    await fin.ctx.close();

    const proc = await asUser(browser, "procurement@hspmart.test");
    expect((await proc.page.request.get("/api/admin/exports/tally")).status()).toBe(403);
    await proc.ctx.close();
  });
});

/* ── 7.3 renewal commission on contracted accounts ─────── */

test.describe.serial("7.3 contracted accounts carry renewal commission after lead protection ends", () => {
  const customerEmail = uniqueEmail("renewal");
  let partnerCode = "";

  test.beforeAll(async () => {
    const p = await createPartner(uniqueEmail("renew-assoc"), "associate");
    partnerCode = p.code;
    const [c] = await sql`insert into customers (kind, name, email, dedupe_key) values ('organisation', 'Renewal Co', ${customerEmail}, ${"email:" + customerEmail}) returning id`;
    // A lead that converted and whose 90-day protection has since expired.
    await sql`insert into leads (customer_id, partner_id, status, protection_expires_at) values (${c.id}, ${p.partnerId}, 'converted', now() - interval '1 day')`;
  });

  test("without a contract, a new HSP quote is direct", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    const no = await quote(admin.page, customerEmail);
    const [q] = await sql`select channel, partner_id from quotations where number = ${no}`;
    expect(q.channel).toBe("direct");
    expect(q.partner_id).toBeNull();
    await admin.ctx.close();
  });

  test("admin records a contract; renewal quotes are attributed at the renewal rate", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl("/partners"));
    await admin.page.getByLabel("Contract customer email").fill(customerEmail);
    await admin.page.getByLabel("Contract partner code").fill(partnerCode);
    await admin.page.getByLabel("Contract months").fill("12");
    await admin.page.getByLabel("Renewal commission percent").fill("12");
    await admin.page.getByRole("button", { name: "Record contract" }).click();
    await expectProblem(admin.page, "0% and 10%");
    await admin.page.getByLabel("Contract customer email").fill(customerEmail);
    await admin.page.getByLabel("Contract partner code").fill(partnerCode);
    await admin.page.getByLabel("Renewal commission percent").fill("5");
    await admin.page.getByRole("button", { name: "Record contract" }).click();
    await expect(admin.page.getByTestId(`contract-${customerEmail}`)).toContainText("active");

    const no = await quote(admin.page, customerEmail);
    const [q] = await sql`select channel, commission_paise, subtotal_paise from quotations where number = ${no}`;
    expect(q.channel).toBe("associate");
    expect(Number(q.commission_paise)).toBe(Math.round(Number(q.subtotal_paise) * 0.05));

    // Ending the contract (service stopped) returns the account to HSP direct.
    await admin.page.goto(adminUrl("/partners"));
    const row = admin.page.getByTestId(`contract-${customerEmail}`);
    await row.getByLabel("End reason").fill("Partner stopped servicing the account");
    await row.getByRole("button", { name: "End" }).click();
    await expect(row).toContainText("ended");
    const no2 = await quote(admin.page, customerEmail);
    const [q2] = await sql`select channel from quotations where number = ${no2}`;
    expect(q2.channel).toBe("direct");
    await admin.ctx.close();
  });
});

async function quote(page: Page, email: string) {
  await page.goto(adminUrl("/quotes"));
  await page.getByLabel("Customer name").fill("Renewal Co");
  await page.getByLabel("Customer email").fill(email);
  await page.getByLabel(/^Lines/).fill(`${P.sku}, 20`);
  await page.getByRole("button", { name: "Create quote" }).click();
  await expect(page).toHaveURL(/\/quotes\/Q-/);
  return page.url().split("/").pop()!.split("?")[0];
}

/* ── 7.4 files & notifications ─────────────────────────── */

test.describe("7.4 secure files and the notification cron", () => {
  test("uploads are type-checked by content and downloads are authorised", async ({ browser }) => {
    const email = uniqueEmail("artfile");
    const o = await makeOrder({ customerEmail: email, status: "awaiting_artwork", lines: [{ productId: P.id, quantity: 1, pricePaise }] });
    await sql`update orders set requires_artwork = true where id = ${o.id}`;
    const buyer = await asUser(browser, email);
    await buyer.page.goto(`/my/orders/${o.number}`);
    await buyer.page.getByLabel("Artwork file").setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") });
    await buyer.page.getByRole("button", { name: "Upload artwork" }).click();
    await expectProblem(buyer.page, "PDF, PNG");
    await buyer.page.getByLabel("Artwork file").setInputFiles({ name: "logo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await buyer.page.getByRole("button", { name: "Upload artwork" }).click();
    await expect(buyer.page.getByTestId("artwork-row")).toContainText("logo.pdf");
    const [f] = await sql`select id from files where entity_id = ${o.id}`;
    const own = await buyer.page.request.get(`/api/files/${f.id}`);
    expect(own.status()).toBe(200);
    expect(own.headers()["content-disposition"]).toContain("attachment");
    expect(own.headers()["x-content-type-options"]).toBe("nosniff");

    const stranger = await asUser(browser, uniqueEmail("snoop"));
    expect((await stranger.page.request.get(`/api/files/${f.id}`)).status()).toBe(404);
    await Promise.all([buyer.ctx.close(), stranger.ctx.close()]);
  });

  test("notification cron requires the secret", async ({ request }) => {
    expect((await request.get("/api/cron/notifications")).status()).toBe(401);
    const ok = await request.get("/api/cron/notifications", { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toHaveProperty("attempted");
  });
});
