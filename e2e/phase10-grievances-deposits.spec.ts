/**
 * Phase 10: closing the remaining blueprint gaps — customer complaints (HSP accountable, partner assists,
 * supplier fixes defects), franchise deposit settlement (maker-checker), customer advances held as a
 * liability, and the P2 analytics (demand forecast, franchise analytics, supplier scorecard).
 */
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../playwright.config";
import { asUser, createPartner, createUser, makeOrder, sql, uniqueEmail } from "./helpers";

const ADMIN_APP = `http://localhost:${ADMIN_PORT}`;
test.describe.configure({ mode: "serial" });

async function adminApp(page: Page, path: string, identifier: string) {
  await page.goto(`${ADMIN_APP}${path}`);
  if (await page.getByLabel("Email or mobile").isVisible().catch(() => false)) {
    await page.getByLabel("Email or mobile").fill(identifier);
    await page.getByRole("button", { name: "Send code" }).click();
    const code = (await page.getByTestId("dev-code").textContent())!.replace(/\D/g, "");
    await page.getByLabel(/Code sent/).fill(code);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
}

test.describe("10.1 complaints flow from customer to supplier and back", () => {
  const customer = uniqueEmail("gr-cust");
  const supplierEmail = uniqueEmail("gr-sup");
  const partnerEmail = uniqueEmail("gr-partner");
  let order = "";

  test("a customer reports a problem on their order", async ({ browser }) => {
    await createUser(customer, "customer", "Complaining Customer");
    const { partnerId } = await createPartner(partnerEmail, "associate");
    order = (await makeOrder({ customerEmail: customer, status: "dispatched", paidFraction: 1, partnerId,
      lines: [{ productId: "executive-notebook-01", quantity: 10, pricePaise: 42000 }] })).number;
    const supplierUser = await createUser(supplierEmail, "supplier", "Gr Supplier");
    const [s] = await sql`insert into suppliers (name, city, status, user_id) values ('Complaint Test Supplier', 'Pune', 'approved', ${supplierUser}) returning id`;
    await sql`insert into purchase_orders (number, order_id, supplier_id, total_cost_paise)
              select ${"PO-GR-" + order}, id, ${s.id}, 300000 from orders where number = ${order}`;

    const { ctx, page } = await asUser(browser, customer);
    await page.goto(`/my/orders/${order}`);
    await page.getByLabel("Problem type").selectOption("damaged");
    await page.getByLabel("Describe the problem").fill("Three notebooks arrived with torn covers.");
    await page.getByRole("button", { name: "Submit complaint" }).click();
    await expect(page.getByTestId("customer-grievances")).toContainText("damaged");
    await expect(page.getByTestId("customer-grievances")).toContainText("open");
    await ctx.close();
  });

  test("the selling partner sees it; staff route it to the supplier", async ({ browser }) => {
    const p = await asUser(browser, partnerEmail);
    await p.page.goto("/partner/complaints");
    await expect(p.page.getByTestId("partner-grievances")).toContainText(order);
    await p.ctx.close();

    const [g] = await sql`select g.number from grievances g join orders o on o.id = g.order_id where o.number = ${order}`;
    const admin = await asUser(browser, "admin@hspmart.test");
    await adminApp(admin.page, "/complaints", "admin@hspmart.test");
    const card = admin.page.getByTestId(`grievance-${g.number}`);
    await card.getByRole("button", { name: "Send to supplier" }).click();
    await expect(card.getByRole("status")).toContainText("Sent to supplier");
    await admin.ctx.close();
  });

  test("the supplier responds and HSP resolves; the customer is told", async ({ browser }) => {
    const s = await asUser(browser, supplierEmail);
    await s.page.goto("/supplier");
    const list = s.page.getByTestId("supplier-grievances");
    await expect(list).toContainText("torn covers");
    await expect(list).not.toContainText(customer);
    await list.getByRole("textbox").fill("Replacement notebooks dispatched by courier today.");
    await s.page.getByRole("button", { name: "Send response" }).click();
    await expect(s.page.getByText("Response sent to HSP")).toBeVisible();
    await s.ctx.close();

    const [g] = await sql`select g.number from grievances g join orders o on o.id = g.order_id where o.number = ${order}`;
    const admin = await asUser(browser, "admin@hspmart.test");
    await adminApp(admin.page, "/complaints", "admin@hspmart.test");
    const card = admin.page.getByTestId(`grievance-${g.number}`);
    await expect(card).toContainText("Replacement notebooks");
    await card.getByLabel("Resolution").fill("Replacements delivered and accepted by customer.");
    await card.getByRole("button", { name: "Resolve" }).click();
    await expect(admin.page.getByTestId("grievance-notice")).toContainText(`${g.number} resolved`);
    await admin.ctx.close();

    const c = await asUser(browser, customer);
    await c.page.goto(`/my/orders/${order}`);
    await expect(c.page.getByTestId("customer-grievances")).toContainText("Replacements delivered");
    await c.ctx.close();
    const [n] = await sql`select count(*)::int as n from notifications where template = 'grievance.resolved' and payload->>'grievance' = ${g.number}`;
    expect(n.n).toBeGreaterThan(0);
  });
});

test.describe("10.2 franchise deposits are settled by two finance users", () => {
  test("raise with a documented deduction, approve by a second user, liability released", async ({ browser }) => {
    const franchiseEmail = uniqueEmail("gr-fr");
    const finance = uniqueEmail("gr-fin");
    await createUser(finance, "hsp_finance", "Finance Checker");
    const { partnerId, code } = await createPartner(franchiseEmail, "franchise");
    await sql`update partners set status = 'suspended', security_deposit_paise = 5000000 where id = ${partnerId}`;

    const maker = await asUser(browser, "admin@hspmart.test");
    await adminApp(maker.page, "/partners", "admin@hspmart.test");
    const row = maker.page.getByTestId(`partner-${franchiseEmail}`);
    await row.getByRole("button", { name: "Settle deposit" }).click();
    const form = row.getByTestId("settlement-form");
    await form.getByLabel("Reason for settlement").fill("Franchise agreement ended by mutual consent");
    await form.getByRole("button", { name: "Add deduction" }).click();
    await form.getByLabel("Deduction reason").fill("Unreturned demo kits");
    await form.getByLabel("Deduction amount").fill("5000");
    await expect(form).toContainText("₹45,000");
    await form.getByRole("button", { name: "Raise settlement" }).click();
    await expect(form.getByRole("status")).toContainText("second finance user");
    // The maker cannot approve their own settlement.
    await expect(maker.page.getByTestId("settlements").getByRole("button", { name: "Approve & release" })).toHaveCount(0);
    await maker.ctx.close();

    const checker = await asUser(browser, finance);
    await adminApp(checker.page, "/partners", finance);
    const s = checker.page.getByTestId("settlements").locator("li", { hasText: code });
    await s.getByLabel("Transfer reference").fill("UTR998877");
    await s.getByRole("button", { name: "Approve & release" }).click();
    await expect(s.getByRole("status")).toContainText("deposit released");
    await checker.ctx.close();

    const [p] = await sql`select status::text as status, security_deposit_paise::int as security_deposit_paise from partners where id = ${partnerId}`;
    expect(p).toMatchObject({ status: "terminated", security_deposit_paise: 0 });
    const [ds] = await sql`select refund_paise::int as refund_paise, deduction_paise::int as deduction_paise, payout_reference from deposit_settlements where partner_id = ${partnerId}`;
    expect(ds).toMatchObject({ refund_paise: 4500000, deduction_paise: 500000, payout_reference: "UTR998877" });
  });
});

test.describe("10.3 management sees advances, forecasts and network analytics", () => {
  test("insights page shows the new measures", async ({ browser }) => {
    await makeOrder({ customerEmail: uniqueEmail("gr-adv"), status: "production_approved", paidFraction: 0.5,
      lines: [{ productId: "executive-notebook-01", quantity: 5, pricePaise: 42000 }] });
    const admin = await asUser(browser, "admin@hspmart.test");
    await adminApp(admin.page, "/insights", "admin@hspmart.test");
    await expect(admin.page.getByTestId("advances")).toContainText("₹");
    await expect(admin.page.getByTestId("forecast")).toContainText("promotional");
    await expect(admin.page.getByTestId("franchise-analytics")).toBeVisible();
    await admin.ctx.close();
  });
});

test.describe("10.4 courier booking and installable app", () => {
  test("staff book a courier from the order page; the AWB is recorded", async ({ browser }) => {
    const { number } = await makeOrder({ customerEmail: uniqueEmail("gr-courier"), status: "po_issued", paidFraction: 1,
      lines: [{ productId: "executive-notebook-01", quantity: 2, pricePaise: 42000 }] });
    await sql`update orders set shipping_address = ${sql.json({ name: "Asha", phone: "9876543210", line1: "1 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" })} where number = ${number}`;
    const admin = await asUser(browser, "admin@hspmart.test");
    await adminApp(admin.page, `/orders/${number}`, "admin@hspmart.test");
    await admin.page.getByRole("button", { name: "Book courier & dispatch" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("dispatched");
    await expect(admin.page.getByText(/Simulated Courier SIM/)).toBeVisible();
    await admin.ctx.close();
  });

  test("the store can be installed as an app", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m).toMatchObject({ name: "HSP Mart", display: "standalone" });
    expect((await request.get("/icon-512.png")).status()).toBe(200);
  });
});
