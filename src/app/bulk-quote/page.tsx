import type { Metadata } from "next";
import { BulkQuoteClient } from "@/components/bulk-quote/BulkQuoteClient";

export const metadata: Metadata = {
  title: "Request a Bulk Quote",
  description:
    "Request bulk quantities and customization options from HSP Mart.",
};

type Props = {
  searchParams: Promise<{ product?: string | string[] }>;
};

function normalizeProducts(
  raw: string | string[] | undefined,
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((value) => value.trim()).filter(Boolean);
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export default async function BulkQuotePage({ searchParams }: Props) {
  const params = await searchParams;
  const initialProducts = normalizeProducts(params.product);

  return <BulkQuoteClient initialProducts={initialProducts} />;
}
