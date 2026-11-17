/**
 * Phase 4 — Admin & finance: maker-checker payouts with TDS, ledger → paid, accounting CSV
 * exports, management dashboard (incl. associate income distribution), consent-checked outbox.
 */
import { expect, test } from "@playwright/test";
import { seedProducts as catalogue } from "../scripts/db/seed-data/products";
import { asUser, createPartner, makeOrder, signIn, sql, uniqueEmail } from "./helpers";

const P = catalogue.find((p) => p.price >= 500 && p.active !== false)!;

async function seedApprovableCommission(partnerId: string) {
  const order = await makeOrder({
    customerEmail: uniqueEmail("payee-buyer"),
    status: "closed",
    lines: [{ productId: P.id, quantity: 10, pricePaise: Math.round(P.price * 100) }],
    paidFraction: 1,
    partnerId,
    deliveredDaysAgo: 10,
  });
  const amount = Math.round(order.subtotal * 0.1);
  for (const status of ["pending", "earned"]) {
    await sql`insert into commission_ledger (partner_id, order_id, rate_bps, eligible_base_paise, amount_paise, status)
              values (${partnerId}, ${order.id}, 1000, ${order.subtotal}, ${amount}, ${status})`;
  }
  return { order, amount };
}

test.describe.serial("4 finance & administration", () => {
  const partnerEmail = uniqueEmail("payee");
  let partner: Awaited<ReturnType<typeof createPartner>>;
  let commission = 0;

  test("4.2 finance approves earned commission, raises a payout; the raiser cannot approve it", async ({ browser }) => {
    partner = await createPartner(partnerEmail, "associate", "Jaipur");
    commission = (await seedApprovableCommission(partner.partnerId)).amount;

    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto("/admin/partners");
    await finance.page.locator(`[data-testid="partner-${partnerEmail}"]`).getByRole("button", { name: "Approve earned commission" }).click();
    await expect(finance.page.getByTestId("flash-ok")).toBeVisible();

    await finance.page.goto("/admin/payouts");
    await finance.page.getByTestId(`due-${partner.code}`).getByRole("button", { name: "Raise payout" }).click();
    await expect(finance.page.getByTestId("flash-ok")).toContainText("awaiting second approval");
    const [po] = await sql`select gross_paise, tds_paise, net_paise, status from payouts where partner_id = ${partner.partnerId}`;
    expect(Number(po.gross_paise)).toBe(commission);
    expect(Number(po.tds_paise)).toBe(Math.round(commission * 0.02));
    expect(Number(po.net_paise)).toBe(commission - Math.round(commission * 0.02));
    expect(po.status).toBe("requested");

    const row = finance.page.getByTestId("payout-list").locator("li", { hasText: partner.code });
    await row.getByRole("button", { name: "Approve & transfer" }).click();
    await expect(finance.page.getByTestId("flash-error")).toContainText("cannot approve");
    await finance.ctx.close();
  });

  test("4.2 a second approver transfers once; ledger becomes Paid; a re-raise finds nothing due", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto("/admin/payouts");
    const row = admin.page.getByTestId("payout-list").locator("li", { hasText: partner.code });
    await row.getByRole("button", { name: "Approve & transfer" }).click();
    await expect(admin.page.getByTestId("flash-ok")).toContainText("transferred");
    await expect(row).toContainText("processed");
    await expect(row).toContainText("pout_sim_");

    const history = await sql`select status, payout_id is not null as linked from commission_ledger where partner_id = ${partner.partnerId} order by created_at, id`;
    expect(history.map((h) => h.status)).toEqual(["pending", "earned", "approved", "approved", "paid"]);
    expect(history.at(-1)!.linked).toBe(true);
    await expect(admin.page.getByTestId(`due-${partner.code}`)).toHaveCount(0);

    const me = await asUser(browser, partnerEmail);
    await me.page.goto("/partner");
    await expect(me.page.getByTestId("ledger-paid")).not.toHaveText("₹0.00");
    await expect(me.page.getByTestId("ledger-approved")).toHaveText("₹0.00");

    const [n] = await sql`select count(*)::int c from notifications n join users u on u.email = n.recipient
                          where u.id = ${partner.userId} and template = 'payout.processed'`;
    expect(n.c).toBe(1);
    await Promise.all([admin.ctx.close(), me.ctx.close()]);
  });

  test("4.2 suspended partners cannot be paid", async ({ browser }) => {
    const p2 = await createPartner(uniqueEmail("suspended"), "associate");
    await seedApprovableCommission(p2.partnerId);
    await sql`insert into commission_ledger (partner_id, order_id, rate_bps, eligible_base_paise, amount_paise, status)
              select partner_id, order_id, rate_bps, eligible_base_paise, amount_paise, 'approved' from commission_ledger
              where partner_id = ${p2.partnerId} and status = 'earned'`;
    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto("/admin/payouts");
    await sql`update partners set status = 'suspended' where id = ${p2.partnerId}`; // suspended after the page loaded, before the click
    await finance.page.getByTestId(`due-${p2.code}`).getByRole("button", { name: "Raise payout" }).click();
    await expect(finance.page.getByTestId("flash-error")).toContainText("active with verified KYC");
    await finance.ctx.close();
  });

  test("4.3 accounting CSV exports for staff only, with formula-injection protection", async ({ browser }) => {
    await makeOrder({
      customerEmail: uniqueEmail("csv"),
      status: "confirmed",
      lines: [{ productId: P.id, quantity: 1, pricePaise: 10_000 }],
    });
    await sql`update customers set name = '=HYPERLINK("http://x")' where email like 'csv.%'`;
    const admin = await asUser(browser, "admin@hspmart.test");
    const res = await admin.page.request.get("/api/admin/exports/sales");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const csv = await res.text();
    expect(csv.split("\n")[0]).toBe("invoice_ref,date,customer,gstin,taxable_value,gst,invoice_total,credited,received,status");
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect((await admin.page.request.get("/api/admin/exports/commissions")).status()).toBe(200);
    expect((await admin.page.request.get("/api/admin/exports/payouts")).status()).toBe(200);
    expect((await admin.page.request.get("/api/admin/exports/secrets")).status()).toBe(404);

    const cust = await asUser(browser, uniqueEmail("nosy"));
    expect((await cust.page.request.get("/api/admin/exports/sales")).status()).toBe(403);
    await Promise.all([admin.ctx.close(), cust.ctx.close()]);
  });

  test("4.4 dashboard shows channel economics and the associate income distribution", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto("/admin/insights");
    await expect(admin.page.getByTestId("channel-table")).toContainText("direct");
    await expect(admin.page.getByTestId("income-buckets")).toContainText("₹15k+");
    const counts = await admin.page.getByTestId("income-buckets").locator("li span.text-right").allTextContents();
    const [{ n }] = await sql`select count(*)::int n from partners where status = 'active' and type = 'associate'`;
    expect(counts.map(Number).reduce((a, b) => a + b, 0)).toBe(n);
    await expect(admin.page.getByTestId("kpi-overdue")).toBeVisible();
    await admin.ctx.close();
  });

  test("4.5 OTP messages are logged with the code redacted; marketing respects consent", async ({ browser, page }) => {
    const email = uniqueEmail("otp-outbox");
    await signIn(page, email);
    const [otp] = await sql`select status, payload from notifications where recipient = ${email} and template = 'auth.otp'`;
    expect(otp.payload.code).toBe("[redacted]");
    expect(otp.status).toBe("simulated");

    const yes = uniqueEmail("consent-yes");
    const no = uniqueEmail("consent-no");
    await sql`insert into customers (kind, name, email, dedupe_key, marketing_consent) values
              ('individual', 'Yes', ${yes}, ${"email:" + yes}, true), ('individual', 'No', ${no}, ${"email:" + no}, false)`;
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto("/admin/insights");
    await admin.page.getByLabel("Campaign template").fill("festive.diwali.e2e");
    await admin.page.getByRole("button", { name: "Send marketing campaign" }).click();
    await expect(admin.page.getByTestId("flash-ok")).toContainText("Campaign processed");
    const rows = await sql`select recipient, status from notifications where template = 'festive.diwali.e2e' and recipient in (${yes}, ${no})`;
    const by = Object.fromEntries(rows.map((r) => [r.recipient, r.status]));
    expect(by[yes]).toBe("simulated");
    expect(by[no]).toBe("blocked");
    await admin.ctx.close();
  });
});
