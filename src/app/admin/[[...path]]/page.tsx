import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";

/**
 * The staff console is the separate React admin app. Old /admin links (bookmarks, emails, the post-sign-in landing
 * page for staff) forward there. Signed-out visitors are sent to sign in by the proxy; customers, partners and
 * suppliers are sent back to their own area by requireRole.
 */
const ADMIN_APP_URL = (process.env.ADMIN_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");

// Legacy paths that differ in the admin app.
const RENAMED: Record<string, string> = { "quotes/new": "quotes" };

export default async function LegacyAdmin({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const suffix = path.map(encodeURIComponent).join("/");
  await requireRole(STAFF_ROLES, `/admin${suffix ? `/${suffix}` : ""}`);
  redirect(`${ADMIN_APP_URL}/${RENAMED[suffix] ?? suffix}`);
}
