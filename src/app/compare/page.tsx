import type { Metadata } from "next";
import { ComparePageClient } from "@/components/discovery/ComparePageClient";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = {
  title: "Compare Products",
  description: "Compare HSP Mart products side by side.",
};

export default async function ComparePage() {
  await loadSiteData();
  return <ComparePageClient />;
}
