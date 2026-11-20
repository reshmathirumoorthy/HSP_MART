/**
 * Phase 11: launch readiness — the blueprint's financial plan (editable, reproducing the PDF base case),
 * the scale-readiness gate, and CSV imports for HSP's datasets.
 */
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PORT } from "../playwright.config";
import { asUser, createUser, sql, uniqueEmail } from "./helpers";

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

test("the plan shows the blueprint base case and recalculates when finance edits it", async ({ browser }) => {
  const finance = uniqueEmail("plan-fin");
  await createUser(finance, "hsp_finance", "Plan Finance");
  const { ctx, page } = await asUser(browser, finance);
  await adminApp(page, "/plan", finance);
  await expect(page.getByTestId("plan-revenue-1")).toHaveText("297.30");
  await expect(page.getByTestId("plan-ebitda-1")).toHaveText("(30.65)");
  await expect(page.getByTestId("plan-cash-3")).toHaveText("456.39");
  await expect(page.getByTestId("readiness")).toContainText("conditions met");

  await page.getByLabel("Average productive associates year 1").fill("100");
  await page.getByRole("button", { name: "Save & recalculate" }).click();
  await expect(page.getByTestId("plan-associateSales-1")).toHaveText("225.00");
  await page.getByRole("button", { name: "Reset to blueprint" }).click();
  await expect(page.getByTestId("plan-associateSales-1")).toHaveText("112.50");
  await ctx.close();
});

test("procurement imports supplier rates from CSV after a validation check", async ({ browser }) => {
  const name = `CSV Supplier ${Date.now()}`;
  const { ctx, page } = await asUser(browser, "procurement@hspmart.test");
  await adminApp(page, "/imports", "procurement@hspmart.test");
  const card = page.getByTestId("import-suppliers");
  const csv = `supplier_name,city,gstin,login_email,sku,cost_rupees,lead_time_days,stock_quantity\n${name},Pune,,,HSP-STN-001,99.50,4,120\n`;
  await card.getByLabel("File for suppliers").setInputFiles({ name: "s.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await card.getByRole("button", { name: "Check file" }).click();
  await expect(card.getByTestId("import-result-suppliers")).toContainText("1 valid");
  await card.getByRole("button", { name: "Import", exact: true }).click();
  await expect(card.getByTestId("import-result-suppliers")).toContainText("Imported");
  const [r] = await sql`select r.cost_paise::int as cost from suppliers s join supplier_rates r on r.supplier_id = s.id where s.name = ${name}`;
  expect(r.cost).toBe(9950);
  // Finance-only imports are not offered to procurement.
  await expect(page.getByTestId("import-sales_history")).toContainText("cannot run this import");
  await ctx.close();
});
