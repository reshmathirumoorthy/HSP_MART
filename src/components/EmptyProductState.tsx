import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type Props = {
  onClear: () => void;
  hasSearch?: boolean;
  hasFilters?: boolean;
};

export function EmptyProductState({
  onClear,
  hasSearch = false,
  hasFilters = false,
}: Props) {
  const title =
    hasSearch && hasFilters
      ? "No products match this search and these filters."
      : hasFilters
        ? "No products match these filters."
        : hasSearch
          ? "Nothing matched your search."
          : "No products found.";

  const copy =
    hasSearch && hasFilters
      ? "Clear the search and filters, or browse the full catalogue."
      : hasFilters
        ? "Clear filters or choose another category to see more of the catalogue."
        : "Try another product name or SKU, or browse the catalogue.";

  const clearLabel =
    hasSearch && hasFilters
      ? "Clear search and filters"
      : hasSearch
        ? "Clear search"
        : "Clear filters";

  return (
    <EmptyState label="No results" title={title} copy={copy}>
      <button type="button" className="btn btn--primary" onClick={onClear}>
        {clearLabel}
      </button>
      <Link href="/products" className="btn btn--outline">
        Browse all products
      </Link>
    </EmptyState>
  );
}
