import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResultsPage } from "@/components/search/SearchResultsPage";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search HSP Mart for stationery, desk essentials, gifts and customizable products.",
  openGraph: {
    title: "Search | HSP Mart",
    description:
      "Search HSP Mart for stationery, desk essentials, gifts and customizable products.",
    url: "/search",
    siteName: "HSP Mart",
    type: "website",
  },
};

function SearchFallback() {
  return (
    <div className="shell" data-nav-surface="light" style={{ paddingTop: "2.5rem" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
        Loading search…
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchResultsPage />
    </Suspense>
  );
}
