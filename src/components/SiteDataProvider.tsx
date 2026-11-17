"use client";

import type { ReactNode } from "react";
import { applySiteData, type SiteData } from "@/lib/siteData";

/** Applies the backend's catalogue + content in the browser before any child component renders. */
export function SiteDataProvider({ data, children }: { data: SiteData; children: ReactNode }) {
  applySiteData(data);
  return children;
}
