/**
 * Phase 13: staff user and role management in the React admin app (added after the audit found it missing).
 * An admin adds a staff member, who signs in with that role; the admin changes the role (signing them out) and
 * deactivates them; non-admin staff cannot reach the screen.
 */
import { expect, test } from "@playwright/test";
import { ADMIN_PORT } from "../playwright.config";
import { asUser, createUser, signIn, sql, uniqueEmail } from "./helpers";

const ADMIN_APP = `http://localhost:${ADMIN_PORT}`;
test.describe.configure({ mode: "serial" });

test("an admin adds staff, changes their role and deactivates them", async ({ browser }) => {
  const adminEmail = uniqueEmail("users-admin");
  await createUser(adminEmail, "hsp_admin", "Users Admin");
  const admin = await asUser(browser, adminEmail);
  const page = admin.page;
  page.on("dialog", (d) => d.accept());
  await page.goto(`${ADMIN_APP}/users`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Staff & roles");

  const staff = uniqueEmail("new-procurement");
  await page.getByLabel("Name").fill("Priya Procurement");
  await page.getByLabel("Work email").fill(staff);
  await page.getByLabel("New staff role").selectOption("hsp_procurement");
  await page.getByRole("button", { name: "Add staff" }).click();
  await expect(page.getByText(`Added ${staff}`)).toBeVisible();

  // The new person can sign in straight away and lands in the staff area with that role.
  const ctx = await browser.newContext();
  const theirs = await ctx.newPage();
  await signIn(theirs, staff);
  await expect(theirs).toHaveURL(/\/admin$/);
  await expect(theirs.getByTestId("portal-role")).toHaveText("hsp_procurement");

  // Search finds them; changing the role signs them out.
  await page.getByLabel("Search users").fill(staff);
  await expect(page.getByTestId("users-count")).toHaveText("1 person");
  const row = page.getByTestId(`user-${staff}`);
  await row.getByLabel(`Role for ${staff}`).selectOption("hsp_finance");
  await expect(row.getByRole("status")).toContainText("Role changed");
  await theirs.goto("/admin");
  await expect(theirs).toHaveURL(/\/login/);

  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row).toContainText("suspended");
  const [u] = await sql`select role::text as role, active from users where email = ${staff}`;
  expect(u).toEqual({ role: "hsp_finance", active: false });
  // Deactivated accounts cannot sign in again.
  await signIn(theirs, staff).catch(() => {});
  await expect(theirs).toHaveURL(/\/login/);
  await ctx.close();
  await admin.ctx.close();
});

test("non-admin staff cannot see or use staff management", async ({ browser }) => {
  const finance = uniqueEmail("users-finance");
  await createUser(finance, "hsp_finance", "Users Finance");
  const { ctx, page } = await asUser(browser, finance);
  await page.goto(`${ADMIN_APP}/`);
  await expect(page.getByRole("link", { name: "Staff & roles" })).toHaveCount(0);
  await page.goto(`${ADMIN_APP}/users`);
  await expect(page.getByText("Only admins can manage staff.")).toBeVisible();
  expect((await page.request.get(`${ADMIN_APP}/api/admin/users`)).status()).toBe(403);
  await ctx.close();
});
