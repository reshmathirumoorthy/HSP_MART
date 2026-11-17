/**
 * Phase 6 — Scale: corporate gifting programmes (calendar + cron, idempotent), bulk recipient
 * upload with multi-city dispatch, and Hindi language support.
 */
import { expect, test } from "@playwright/test";
import { E2E_CRON_SECRET } from "../playwright.config";
import { asUser, createPartner, makeOrder, signIn, sql, uniqueEmail } from "./helpers";

test.describe.serial("6 scale features", () => {
  test("6.1 an annual programme raises one draft quote when due, then rolls forward a year", async ({ browser, request }) => {
    const [prod] = await sql`select sku from products where active and min_order_quantity <= 20 and price_paise >= 30000 limit 1`;
    const custEmail = uniqueEmail("programme");
    const occasion = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);

    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto("/admin/programmes");
    await admin.page.getByLabel("Customer name").fill("Annual Gifting Co");
    await admin.page.getByLabel("Customer email").fill(custEmail);
    await admin.page.getByLabel("Programme name").fill("Diwali staff gifts");
    await admin.page.getByLabel("Occasion", { exact: true }).fill("Diwali");
    await admin.page.getByLabel("Occasion date").fill(occasion);
    await admin.page.getByLabel("Lead days").fill("30");
    await admin.page.getByLabel("Programme lines").fill(`${prod.sku}, 20`);
    await admin.page.getByRole("button", { name: "Schedule" }).click();
    await expect(admin.page.getByTestId("flash-ok")).toHaveText("Programme scheduled");

    expect((await request.get("/api/cron/programmes")).status()).toBe(401);
    expect((await request.get("/api/cron/programmes", { headers: { authorization: "Bearer wrong-secret-value!!" } })).status()).toBe(401);
    const run = await request.get("/api/cron/programmes", { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } });
    expect(run.status()).toBe(200);
    const { raised } = await run.json();
    expect(raised).toHaveLength(1);

    const [q] = await sql`select q.status, u.email, u.active from quotations q join users u on u.id = q.created_by where q.number = ${raised[0]}`;
    expect(q).toMatchObject({ email: "system@hspmart.internal", active: false });
    expect(["approved", "pending_approval"]).toContain(q.status);

    await admin.page.getByRole("button", { name: "Run due programmes now" }).click();
    await expect(admin.page.getByTestId("flash-ok")).toHaveText("Nothing due");
    const [p] = await sql`select next_date from programmes p join customers c on c.id = p.customer_id where c.email = ${custEmail}`;
    expect(new Date(p.next_date).getFullYear()).toBe(new Date(occasion).getFullYear() + 1);
    await expect(admin.page.getByTestId("programme-list")).toContainText(raised[0]);
    await admin.ctx.close();
  });

  test("6.2 bulk recipients are validated, must match order units, and split dispatch by city", async ({ browser }) => {
    const [prod] = await sql`select id from products where active limit 1`;
    const order = await makeOrder({
      customerEmail: uniqueEmail("bulk"),
      status: "production_approved",
      lines: [{ productId: prod.id, quantity: 3, pricePaise: 40_000 }],
      paidFraction: 1,
    });
    const admin = await asUser(browser, "admin@hspmart.test");
    await admin.page.goto(`/admin/orders/${order.number}`);

    await admin.page.getByLabel("Recipients CSV", { exact: true }).fill("name, phone, address, city, pincode, quantity\nAsha, 98765 43210, 12 MG Road, Pune, 0110, 1");
    await admin.page.getByRole("button", { name: "Upload recipients" }).click();
    await expect(admin.page.getByTestId("flash-error")).toContainText("invalid PIN code");

    await admin.page.getByLabel("Recipients CSV", { exact: true }).fill("Asha, 9876543210, 12 MG Road, Pune, 411001, 1");
    await admin.page.getByRole("button", { name: "Upload recipients" }).click();
    await expect(admin.page.getByTestId("flash-error")).toContainText("account for 1 units but the order has 3");

    await admin.page
      .getByLabel("Recipients CSV", { exact: true })
      .fill(
        [
          "name, phone, address, city, pincode, quantity",
          'Asha Rao, +91 98765 43210, "Flat 4, Lotus Apts, MG Road", Pune, 411001, 2',
          "Vikram Shah, 9123456780, 7 Marine Drive, Mumbai, 400020, 1",
        ].join("\n"),
      );
    await admin.page.getByRole("button", { name: "Upload recipients" }).click();
    await expect(admin.page.getByTestId("recipient-summary")).toContainText("2 recipients across 2 cities: Pune (2), Mumbai (1)");
    const [r] = await sql`select address_line, phone from recipients where name = 'Asha Rao' order by created_at desc limit 1`;
    expect(r).toMatchObject({ address_line: "Flat 4, Lotus Apts, MG Road", phone: "+919876543210" });

    await sql`update orders set status = 'po_issued' where id = ${order.id}`;
    await admin.page.reload();
    await admin.page.getByLabel("Courier").fill("DTDC");
    await admin.page.getByLabel("Tracking number").fill("DT5555");
    await admin.page.getByRole("button", { name: "Mark dispatched" }).click();
    await expect(admin.page.getByTestId("order-status")).toHaveText("dispatched");
    await expect(admin.page.getByTestId("shipment-row")).toHaveCount(2);
    await expect(admin.page.getByTestId("shipment-row").filter({ hasText: "Pune:" })).toContainText("DT5555-");
    const [{ unlinked }] = await sql`select count(*)::int unlinked from recipients where order_id = ${order.id} and shipment_id is null`;
    expect(unlinked).toBe(0);
    await admin.ctx.close();
  });

  test("6.3 Hindi: the choice persists from login into the partner portal and back", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.getByTestId("login-title")).toHaveText("HSP Mart में साइन इन करें");

    const email = uniqueEmail("hindi");
    await createPartner(email, "associate", "Varanasi");
    await page.getByLabel("ईमेल या मोबाइल नंबर").fill(email);
    await page.getByRole("button", { name: "साइन-इन कोड भेजें" }).click();
    const code = (await page.getByTestId("dev-otp").locator("code").textContent())!.trim();
    await page.getByLabel("साइन-इन कोड").fill(code);
    await page.getByRole("button", { name: "साइन इन करें" }).click();
    await expect(page).toHaveURL(/\/partner$/);
    await expect(page.getByRole("link", { name: "कमाई" })).toBeVisible();
    await expect(page.getByText("कमीशन खाता")).toBeVisible();
    const [u] = await sql`select locale from users where email = ${email}`;
    expect(u.locale).toBe("hi");

    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("link", { name: "Earnings" })).toBeVisible();
    const [u2] = await sql`select locale from users where email = ${email}`;
    expect(u2.locale).toBe("en");
  });

  test("6.x regression: an English-only user still signs in normally", async ({ page }) => {
    await page.context().clearCookies();
    await signIn(page, uniqueEmail("english"));
    await expect(page).toHaveURL(/\/account/);
  });
});
