/**
 * Phase 5 — AI engines: discovery, quotation assistant (draft-only), sales coach (EN/HI),
 * procurement ranking (approved suppliers only), management intelligence; and AI controls.
 */
import { expect, test } from "@playwright/test";
import { adminUrl, asUser, createPartner, makeOrder, sql, uniqueEmail } from "./helpers";

test.describe.serial("5 AI engines", () => {
  test("5.1 discovery returns active, in-budget, occasion-appropriate products and never cost", async ({ request }) => {
    const [victim] = await sql`select id, sku from products where division = 'festive' and price_paise <= 200000 and active order by price_paise desc limit 1`;
    await sql`update products set active = false where id = ${victim.id}`;
    try {
      const res = await request.get("/api/ai/discover?q=diwali%20gift&budget=2000&qty=10");
      expect(res.status()).toBe(200);
      const { results } = await res.json();
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(["festive", "premium"]).toContain(r.division);
        expect(r.pricePaise).toBeLessThanOrEqual(200_000);
        expect(r).not.toHaveProperty("costPaise");
        expect(r.sku).not.toBe(victim.sku);
      }
      expect((await request.post("/api/ai/discover")).status()).toBe(405);
    } finally {
      await sql`update products set active = true where id = ${victim.id}`;
    }
  });

  test("5.2 quotation assistant understands a request, drafts lines and saves nothing", async ({ browser }) => {
    const [{ before }] = await sql`select count(*)::int before from quotations`;
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl("/assistant"));
    await admin.page.getByLabel("Customer request").fill("Hi, we need 25 Diwali hampers under 3000 each with our logo, delivered in 20 days.");
    await admin.page.getByRole("button", { name: "Draft quote" }).click();
    await expect(admin.page.getByTestId("u-qty")).toHaveText("25");
    await expect(admin.page.getByTestId("u-budget")).toHaveText("₹3000");
    await expect(admin.page.getByTestId("u-branding")).toContainText("Yes");
    await expect(admin.page.getByTestId("suggestions").locator("li").first()).toBeVisible();
    const draftLines = (await admin.page.getByTestId("draft-lines").textContent())!;
    expect(draftLines).toMatch(/, 25, , Logo branding/);

    const [{ after }] = await sql`select count(*)::int after from quotations`;
    expect(after).toBe(before);

    await admin.page.getByRole("link", { name: "Open as a new quote" }).click();
    await expect(admin.page.getByLabel(/^Lines/)).toHaveValue(draftLines);
    await admin.ctx.close();
  });

  test("5.3 sales coach flags expiring protection and drafts English and Hindi messages", async ({ browser }) => {
    const email = uniqueEmail("coached");
    const p = await createPartner(email, "associate", "Lucknow");
    const custEmail = uniqueEmail("coach-cust");
    const [c] = await sql`insert into customers (kind, name, email, dedupe_key) values ('organisation', 'Lucknow Steel', ${custEmail}, ${"email:" + custEmail}) returning id`;
    await sql`insert into leads (customer_id, partner_id, protection_expires_at) values (${c.id}, ${p.partnerId}, now() + interval '10 days')`;
    const me = await asUser(browser, email);
    await me.page.goto("/partner/coach");
    await expect(me.page.getByTestId("follow-ups")).toContainText("protection-expiring");
    await expect(me.page.getByTestId("follow-ups")).toContainText("Lucknow Steel");
    await expect(me.page.getByTestId("msg-en")).toContainText("Lucknow Steel");
    await expect(me.page.getByTestId("msg-hi")).toContainText(/[ऀ-ॿ]/);
    await expect(me.page.getByTestId("occasions").locator("li").first()).toBeVisible();
    await me.ctx.close();
  });

  test("5.4 procurement ranking considers only approved suppliers and prefers best value", async ({ browser }) => {
    const [prod] = await sql`select id, price_paise from products where active and min_order_quantity <= 10 order by price_paise desc limit 1 offset 40`;
    const mk = async (name: string, status: string, costPct: number, lead: number) => {
      const [s] = await sql`insert into suppliers (name, status, on_time_rate_bps, quality_score_bps) values (${name}, ${status}, 9000, 9000) returning id`;
      await sql`insert into supplier_rates (supplier_id, product_id, cost_paise, lead_time_days, stock_quantity)
                values (${s.id}, ${prod.id}, ${Math.round(Number(prod.price_paise) * costPct)}, ${lead}, 1000)`;
    };
    await mk("AI Best Value Co", "approved", 0.55, 4);
    await mk("AI Pricey Slow Co", "approved", 0.75, 12);
    await mk("AI Cheapest Unapproved", "pending", 0.3, 1);
    const order = await makeOrder({
      customerEmail: uniqueEmail("rank"),
      status: "production_approved",
      lines: [{ productId: prod.id, quantity: 10, pricePaise: Number(prod.price_paise) }],
      paidFraction: 1,
    });
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${order.number}`));
    const ranking = admin.page.getByTestId("supplier-ranking");
    await expect(ranking.locator("li").first()).toContainText("AI Best Value Co");
    await expect(ranking).toContainText("AI Pricey Slow Co");
    await expect(ranking).not.toContainText("Unapproved");
    await expect(admin.page.getByLabel("Supplier").locator("option:checked")).toHaveText("AI Best Value Co");
    await admin.ctx.close();
  });

  test("5.5 management intelligence flags overdue payments and late suppliers", async ({ browser }) => {
    const [prod] = await sql`select id from products where active limit 1`;
    const overdue = await makeOrder({
      customerEmail: uniqueEmail("overdue"),
      status: "delivered",
      lines: [{ productId: prod.id, quantity: 2, pricePaise: 50_000 }],
      paidFraction: 0.5,
    });
    const [s] = await sql`insert into suppliers (name, status) values ('Late Logistics', 'approved') returning id`;
    await sql`insert into supplier_rates (supplier_id, product_id, cost_paise, lead_time_days) values (${s.id}, ${prod.id}, 1000, 5)`;
    const poOrder = await makeOrder({ customerEmail: uniqueEmail("latepo"), status: "po_issued", lines: [{ productId: prod.id, quantity: 1, pricePaise: 50_000 }], paidFraction: 1 });
    await sql`insert into purchase_orders (number, order_id, supplier_id, total_cost_paise, created_at)
              values (${"PO-LATE-" + Date.now()}, ${poOrder.id}, ${s.id}, 1000, now() - interval '20 days')`;

    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl("/insights"));
    const alerts = admin.page.getByTestId("ai-alerts");
    await expect(alerts).toContainText(`Order ${overdue.number}`);
    await expect(alerts).toContainText("overdue-payment");
    await expect(alerts).toContainText("Late Logistics is 15 days past lead time");
    await admin.ctx.close();
  });

  test("5.6 AI controls: using every engine leaves prices, commissions, suppliers and quotes untouched", async ({ browser, request }) => {
    const snapshot = () => sql`select (select sum(price_paise) from products)::bigint p, (select count(*) from commission_ledger)::int c,
                                      (select count(*) from suppliers where status = 'approved')::int s, (select count(*) from quotations)::int q,
                                      (select count(*) from payouts)::int po`;
    const [before] = await snapshot();
    for (const q of ["diwali", "wedding return gifts", "employee onboarding kit", "conference merch"]) {
      expect((await request.get(`/api/ai/discover?q=${encodeURIComponent(q)}&budget=5000&qty=50`)).status()).toBe(200);
    }
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/assistant?q=${encodeURIComponent("200 premium hampers under 5000 with logo")}`));
    await expect(admin.page.getByTestId("understood")).toBeVisible();
    await admin.page.goto(adminUrl("/insights"));
    await expect(admin.page.getByTestId("ai-alerts")).toBeVisible();
    const [after] = await snapshot();
    expect(after).toEqual(before);
    await admin.ctx.close();
  });
});
