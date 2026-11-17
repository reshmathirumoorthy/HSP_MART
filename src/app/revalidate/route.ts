/**
 * Called by the backend after an admin edits the catalogue or site content, so the storefront shows
 * the change on the next request. Protected by REVALIDATE_SECRET (shared with the backend).
 */
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { SITE_DATA_TAG } from "@/lib/siteData.server";

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const given = req.headers.get("x-revalidate-secret") ?? "";
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ error: "unauthorized" }, { status: 401 });
  revalidateTag(SITE_DATA_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
