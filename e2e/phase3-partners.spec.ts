/**
 * Phase 3 — Partner network: onboarding & KYC, deposits as liabilities, lead protection,
 * attribution, partner quotes at approved prices, commission ledger lifecycle,
 * partner isolation, supplier portal.
 */
import { expect, test } from "@playwright/test";
import { seedProducts as catalogue } from "../scripts/db/seed-data/products";
import { E2E_WEBHOOK_SECRET } from "../playwright.config";
import { adminUrl, asUser, createPartner, expectNotice, expectProblem, payInFull, signIn, sql, uniqueEmail } from "./helpers";

// Products with no supplier rate yet → engine estimates 70% cost: associate 13%, franchise 11%.
const sellable = catalogue.filter((p) => p.price >= 200 && (p.minOrderQuantity ?? 1) <= 4 && p.active !== false);
const C = sellable[5];
const D = sellable[6];
const domain = `corp${Date.now().toString(36)}.test`;

test.describe.serial("3 partner network", () => {
  const applicant = uniqueEmail("applicant");
  const buyer = `buyer@${domain}`;
  let orderNo = "";
  let cancelOrderNo = "";

  test("3.1 a customer applies; validation, agreement and KYC gate activation", async ({ browser }) => {
    const { ctx, page } = await asUser(browser, applicant);
    await page.goto("/join");
    await page.getByLabel("City", { exact: true }).fill("Pune");
    await page.getByLabel("PAN").fill("BADPAN");
    await page.getByLabel("Bank IFSC").fill("HDFC0001234");
    await page.getByLabel("Bank account (last 4 digits)").fill("4321");
    await page.getByRole("button", { name: "Submit application" }).click();
    await expectProblem(page, "accept the partner agreement");

    await page.getByLabel("City", { exact: true }).fill("Pune");
    await page.getByLabel("PAN").fill("BADPAN");
    await page.getByLabel("Bank IFSC").fill("HDFC0001234");
    await page.getByLabel("Bank account (last 4 digits)").fill("4321");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expectProblem(page, "valid PAN");

    await page.getByLabel("City", { exact: true }).fill("Pune");
    await page.getByLabel("PAN").fill("abcde1234f");
    await page.getByLabel("Bank IFSC").fill("hdfc0001234");
    await page.getByLabel("Bank account (last 4 digits)").fill("4321");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByTestId("application-status")).toContainText("kyc_pending");

    // Not yet a partner: the portal is closed.
    await page.goto("/partner");
    await expect(page).toHaveURL(/\/account/);

    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto(adminUrl("/partners"));
    await finance.page.getByTestId(`partner-${applicant}`).getByRole("button", { name: "Verify KYC" }).click();
    await expectNotice(finance.page, "KYC verified");

    // Same session, role now read from DB → portal opens without signing in again.
    await page.goto("/partner");
    await expect(page.getByTestId("partner-status")).toHaveText("active");
    await expect(page.getByTestId("ledger-pending")).toContainText("0");
    const [p] = await sql`select pan, bank_ifsc, agreement_version from partners p join users u on u.id = p.user_id where u.email = ${applicant}`;
    expect([p.pan, p.bank_ifsc, p.agreement_version]).toEqual(["ABCDE1234F", "HDFC0001234", "HSP-PA-2026.1"]);
    await Promise.all([ctx.close(), finance.ctx.close()]);
  });

  test("3.1 franchise deposits are tracked as a liability; associates hold none", async ({ browser }) => {
    const fr = await createPartner(uniqueEmail("franchise"), "franchise", "Nagpur");
    const assoc = await createPartner(uniqueEmail("assocdep"), "associate");
    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto(adminUrl("/partners"));
    const before = await finance.page.getByTestId("deposit-liability").textContent();
    const card = finance.page.locator(`[data-testid^="partner-"]`, { hasText: fr.code });
    await card.getByLabel("Deposit received").fill("50000");
    await card.getByRole("button", { name: "Record deposit" }).click();
    await expectNotice(finance.page, "Deposit recorded as liability");
    await expect(finance.page.getByTestId("deposit-liability")).not.toHaveText(before!);
    const [row] = await sql`select security_deposit_paise from partners where id = ${fr.partnerId}`;
    expect(Number(row.security_deposit_paise)).toBe(5_000_000);
    const [{ n }] = await sql`select count(*)::int n from audit_events where action = 'partner.deposit_recorded' and after->>'accounting' = 'liability'`;
    expect(n).toBeGreaterThan(0);
    expect(assoc.code).toMatch(/^HSP-T-/);
    await finance.ctx.close();
  });

  test("3.2 leads are protected for 90 days by email domain; duplicates and key accounts are refused", async ({ browser }) => {
    const me = await asUser(browser, applicant);
    await me.page.goto("/partner/leads");
    await me.page.getByLabel("Customer name").fill("Corp X Pvt Ltd");
    await me.page.getByLabel("Customer email").fill(buyer);
    await me.page.getByRole("button", { name: "Register lead" }).click();
    await expectNotice(me.page, "protected for 90 days");
    await expect(me.page.getByTestId("lead-list")).toContainText(/registered · (89|90)d left/);

    await me.page.getByLabel("Customer name").fill("Corp X Pvt Ltd");
    await me.page.getByLabel("Customer email").fill(buyer);
    await me.page.getByRole("button", { name: "Register lead" }).click();
    await expectProblem(me.page, "already registered");

    const rivalEmail = uniqueEmail("rival");
    await createPartner(rivalEmail, "associate", "Mumbai");
    const rival = await asUser(browser, rivalEmail);
    await rival.page.goto("/partner/leads");
    await rival.page.getByLabel("Customer name").fill("Corp X HR team");
    await rival.page.getByLabel("Customer email").fill(`hr@${domain}`);
    await rival.page.getByRole("button", { name: "Register lead" }).click();
    await expectProblem(rival.page, "protected by another partner");
    // Isolation: the rival never sees the other partner's lead.
    await expect(rival.page.getByTestId("lead-list")).not.toContainText(domain);

    const admin = await asUser(browser, "admin@hspmart.test");
    const keyEmail = `procurement@bigco${Date.now().toString(36)}.test`;
    await sql`insert into customers (kind, name, email, dedupe_key, is_national_key_account)
              values ('organisation', 'BigCo India', ${keyEmail}, ${"domain:" + keyEmail.split("@")[1]}, true)`;
    await rival.page.getByLabel("Customer name").fill("BigCo");
    await rival.page.getByLabel("Customer email").fill(keyEmail);
    await rival.page.getByRole("button", { name: "Register lead" }).click();
    await expectProblem(rival.page, "national key account");
    await Promise.all([me.ctx.close(), rival.ctx.close(), admin.ctx.close()]);
  });

  test("3.3 partners quote only approved prices; associate quotes clear the margin floor", async ({ browser }) => {
    const me = await asUser(browser, applicant);
    await me.page.goto("/partner/quotes");
    await me.page.getByLabel("Quote lines").fill(`${C.sku}, 4, 1`);
    await me.page.getByRole("button", { name: "Price quote" }).click();
    await expectProblem(me.page, "approved catalogue prices only");

    await me.page.getByLabel("Quote lines").fill(`${C.sku}, 4`);
    await me.page.getByRole("button", { name: "Price quote" }).click();
    await expectNotice(me.page, "created");
    const [q] = await sql`select number, status, channel, contribution_bps, commission_paise, subtotal_paise from quotations
                          where partner_id = (select p.id from partners p join users u on u.id = p.user_id where u.email = ${applicant})
                          order by created_at desc limit 1`;
    expect([q.status, q.channel, q.contribution_bps]).toEqual(["approved", "associate", 1300]);
    expect(Number(q.commission_paise)).toBe(Math.round(Number(q.subtotal_paise) * 0.1));

    await me.page.getByTestId("partner-quotes").locator("li", { hasText: q.number }).getByRole("button", { name: "Send" }).click();
    await expectNotice(me.page, "sent");

    const customer = await asUser(browser, buyer);
    await customer.page.goto(`/my/quotes/${q.number}`);
    await customer.page.getByRole("button", { name: "Accept quotation" }).click();
    await expect(customer.page).toHaveURL(/\/my\/orders\//);
    orderNo = customer.page.url().split("/").pop()!.split("?")[0];

    await me.page.goto("/partner");
    await expect(me.page.getByTestId("ledger-pending")).not.toHaveText("₹0.00");
    await expect(me.page.getByTestId("ledger-table")).toContainText(orderNo);
    await Promise.all([me.ctx.close(), customer.ctx.close()]);
  });

  test("3.3 franchise (12%) quotes on the same cost fall below 12% and need HSP approval", async ({ browser }) => {
    const email = uniqueEmail("fq");
    await createPartner(email, "franchise", "Indore");
    const fr = await asUser(browser, email);
    await fr.page.goto("/partner/leads");
    await fr.page.getByLabel("Customer name").fill("Indore Retail");
    await fr.page.getByLabel("Customer email").fill(uniqueEmail("indore"));
    await fr.page.getByRole("button", { name: "Register lead" }).click();
    await expect(fr.page.getByRole("status").first()).toBeVisible();
    await fr.page.goto("/partner/quotes");
    await fr.page.getByLabel("Quote lines").fill(`${D.sku}, 4`);
    await fr.page.getByRole("button", { name: "Price quote" }).click();
    const item = fr.page.getByTestId("partner-quotes").locator("li").first();
    await expect(item).toContainText("pending_approval");
    await expect(item.getByRole("button", { name: "Send" })).toHaveCount(0);
    await fr.ctx.close();
  });

  test("3.2 a direct HSP quote to a protected customer is still attributed to the partner", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl("/quotes"));
    await admin.page.getByLabel("Customer name").fill("Corp X Pvt Ltd");
    await admin.page.getByLabel("Customer email").fill(buyer);
    await admin.page.getByLabel(/^Lines/).fill(`${D.sku}, 4`);
    await admin.page.getByRole("button", { name: "Create quote" }).click();
    await expect(admin.page).toHaveURL(/\/quotes\/Q-/);
    const no = admin.page.url().split("/").pop()!.split("?")[0];
    const [q] = await sql`select q.channel, p.user_id = u.id as mine from quotations q join partners p on p.id = q.partner_id
                          join users u on u.email = ${applicant} where q.number = ${no}`;
    expect(q).toMatchObject({ channel: "associate", mine: true });
    await admin.page.getByRole("button", { name: "Send to customer" }).click();
    const customer = await asUser(browser, buyer);
    await customer.page.goto(`/my/quotes/${no}`);
    await customer.page.getByRole("button", { name: "Accept quotation" }).click();
    await expect(customer.page).toHaveURL(/\/my\/orders\//);
    cancelOrderNo = customer.page.url().split("/").pop()!.split("?")[0];
    await Promise.all([admin.ctx.close(), customer.ctx.close()]);
  });

  test("3.5 supplier portal: linked login sees only its POs, acknowledges and updates stock", async ({ browser, request }) => {
    const supplierEmail = uniqueEmail("supplier");
    const proc = await asUser(browser, "procurement@hspmart.test");
    await proc.page.goto(adminUrl("/suppliers"));
    await proc.page.getByLabel("Supplier name").fill("Pune Packers");
    await proc.page.getByLabel("City", { exact: true }).fill("Pune");
    await proc.page.getByLabel("Supplier login email").fill(supplierEmail);
    await proc.page.getByRole("button", { name: "Add (pending approval)" }).click();
    const card = proc.page.getByTestId("supplier-Pune Packers");
    await card.getByLabel("Rate SKU").fill(C.sku);
    await card.getByLabel("Rate cost").fill(String(Math.round(C.price * 0.65)));
    await card.getByLabel("Lead time").fill("4");
    await card.getByRole("button", { name: "Save rate" }).click();
    await proc.page.getByTestId("supplier-Pune Packers").getByRole("button", { name: "Approve" }).click();
    await expectNotice(proc.page, "Supplier approved");

    const customer = await asUser(browser, buyer);
    await payInFull(customer.page, request, orderNo, E2E_WEBHOOK_SECRET);

    await proc.page.goto(adminUrl(`/orders/${orderNo}`));
    await proc.page.getByRole("button", { name: "Approve production" }).click();
    await proc.page.getByLabel("Supplier").selectOption({ label: "Pune Packers (Pune)" });
    await proc.page.getByRole("button", { name: "Issue purchase order" }).click();
    await expect(proc.page.getByTestId("order-status")).toHaveText("po issued");

    const sup = await asUser(browser, supplierEmail);
    await sup.page.goto("/supplier");
    await expect(sup.page.getByTestId("supplier-pos").locator("li")).toHaveCount(1);
    await expect(sup.page.getByTestId("supplier-pos")).not.toContainText("Sharma");
    await sup.page.getByRole("button", { name: "Acknowledge" }).click();
    await expectNotice(sup.page, "Purchase order acknowledged");
    await sup.page.getByLabel(`Stock for ${C.sku}`).fill("250");
    await sup.page.getByRole("button", { name: "Update stock" }).click();
    await expectNotice(sup.page, "Stock updated");
    // Suppliers never reach the admin or partner areas.
    await sup.page.goto("/admin/orders"); // the store's /admin only forwards staff
    await expect(sup.page).toHaveURL(/\/supplier$/);
    await Promise.all([proc.ctx.close(), customer.ctx.close(), sup.ctx.close()]);
  });

  test("3.3 ledger: pending → earned on close → approved by finance; cancellation reverses", async ({ browser }) => {
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(adminUrl(`/orders/${orderNo}`));
    await admin.page.getByLabel("Courier").fill("Delhivery");
    await admin.page.getByLabel("Tracking number").fill("DL998877");
    await admin.page.getByRole("button", { name: "Mark dispatched" }).click();
    await admin.page.getByLabel("Delivery proof").fill("POD-DL998877");
    await admin.page.getByRole("button", { name: "Mark delivered" }).click();
    await admin.page.getByRole("button", { name: "Reconcile & close" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("closed");

    const me = await asUser(browser, applicant);
    await me.page.goto("/partner");
    await expect(me.page.getByTestId("ledger-earned")).not.toHaveText("₹0.00");

    const finance = await asUser(browser, "finance@hspmart.test");
    await finance.page.goto(adminUrl("/partners"));
    await finance.page.getByTestId(`partner-${applicant}`).getByRole("button", { name: "Approve earned commission" }).click();
    await expectNotice(finance.page, "Eligible commissions approved");
    await me.page.reload();
    await expect(me.page.getByTestId("ledger-approved")).not.toHaveText("₹0.00");
    await expect(me.page.getByTestId("ledger-earned")).toHaveText("₹0.00");

    await admin.page.goto(adminUrl(`/orders/${cancelOrderNo}`));
    await admin.page.getByRole("button", { name: "Cancel order" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("cancelled");

    // Append-only: history is preserved, latest state wins.
    const history = await sql`select l.status from commission_ledger l join orders o on o.id = l.order_id
                              where o.number = ${orderNo} order by l.created_at`;
    expect(history.map((h) => h.status)).toEqual(["pending", "earned", "approved"]);
    const cancelled = await sql`select l.status from commission_ledger l join orders o on o.id = l.order_id
                                where o.number = ${cancelOrderNo} order by l.created_at`;
    expect(cancelled.map((h) => h.status)).toEqual(["pending", "reversed"]);
    await Promise.all([admin.ctx.close(), me.ctx.close(), finance.ctx.close()]);
  });

  test("3.4 no commission for recruiting: partner signup never creates ledger entries", async ({ page }) => {
    await signIn(page, uniqueEmail("recruit"));
    const [{ n }] = await sql`select count(*)::int n from commission_ledger l left join orders o on o.id = l.order_id where o.id is null`;
    expect(n).toBe(0);
  });
});
