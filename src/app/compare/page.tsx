import type { Metadata } from "next";
import { ComparePageClient } from "@/components/discovery/ComparePageClient";

export const metadata: Metadata = {
  title: "Compare Products",
  description: "Compare HSP Mart products side by side.",
};

export default function ComparePage() {
  return <ComparePageClient />;
}
