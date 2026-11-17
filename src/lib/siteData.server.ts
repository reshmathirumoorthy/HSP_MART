import "server-only";
import { cache } from "react";
import { BACKEND_URL } from "@/lib/api";
import { applySiteData, type SiteData } from "@/lib/siteData";

export const SITE_DATA_TAG = "site-data";

/**
 * Fetches the public catalogue + content (no cookies, so it is shared and cached across requests),
 * applies it to the in-memory store and returns it. Admin edits call /revalidate on this app, which
 * expires the tag; otherwise it refreshes every 5 minutes.
 */
export const loadSiteData = cache(async (): Promise<SiteData> => {
  const res = await fetch(`${BACKEND_URL}/api/site-data`, { next: { tags: [SITE_DATA_TAG], revalidate: 300 } });
  if (!res.ok) throw new Error(`Backend /api/site-data failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as SiteData;
  applySiteData(data);
  return data;
});
