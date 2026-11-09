"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { shopifyImageLoader } from "@/lib/imageLoader";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  productCategories,
  type FilterState,
  type ProductCategorySlug,
} from "@/data/products";
import {
  defaultFilterState,
  filterProducts,
  filtersEqual,
  filtersFromSearchParams,
  getActiveFilterChips,
  getSubcategoriesForCategory,
  searchParamsFromFilters,
} from "@/lib/catalogue";
import { addRecentSearch } from "@/lib/recentSearches";
import { CategoryNav } from "@/components/CategoryNav";
import { SubcategoryNav } from "@/components/SubcategoryNav";
import { ProductSearch } from "@/components/ProductSearch";
import { ProductFilters } from "@/components/ProductFilters";
import { ProductSort } from "@/components/ProductSort";
import { ProductGrid } from "@/components/ProductGrid";
import { EmptyProductState } from "@/components/EmptyProductState";
import { trapTabKey } from "@/lib/focusTrap";
import styles from "./ProductsCatalogue.module.css";

const PAGE_SIZE = 24;

/** Listing-header copy for the gifting occasions in the main menu. */
const OCCASION_COPY: Record<string, string> = {
  "Corporate Gifting":
    "Client, employee and rewards gifting with logo branding, bulk pricing and pan-India dispatch.",
  "Festive Gifting":
    "Diwali hampers, diyas, dry-fruit boxes and Rakhi gifts — curated, packed and delivered on schedule.",
  "Wedding Gifting":
    "Shagun hampers, platters, trousseau packing and return gifts for every ceremony.",
  "Occasional Gifting":
    "Birthdays, anniversaries, baby showers and thank-yous — gifts that arrive ready to give.",
};

const CATEGORY_COPY: Record<string, string> = {
  gifts:
    "Corporate, festive, wedding and occasion gifting — order individually or request bulk pricing.",
  presentation:
    "Magnetic whiteboards, notice and chalk boards, easel stands and accessories for offices and schools.",
  custom:
    "Personalised platters and gifts with names, logos and custom packaging.",
};

type Sheet = "filters" | null;

type Props = {
  initialFilters: FilterState;
};

export function ProductsCatalogue({ initialFilters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [isPending, startTransition] = useTransition();
  const skipUrlSync = useRef(true);
  const searchQueryRef = useRef(searchParams.toString());
  const sheetRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!sheet) return;
    const dialog = sheetRef.current;
    const trigger = filterTriggerRef.current;
    const closeButton = dialog?.querySelector<HTMLButtonElement>(
      "[data-sheet-close]",
    );
    closeButton?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheet(null);
        return;
      }
      if (dialog) trapTabKey(event, dialog);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [sheet]);

  // Lock the document itself, not <body>. Locking body re-parents the sticky
  // navbar into a non-scrollable clip container (flings the header off-screen)
  // and would clobber locks held by other overlays (Navbar, CartDrawer).
  useEffect(() => {
    if (!sheet) return;
    const docEl = document.documentElement;
    const previousOverflow = docEl.style.overflow;
    docEl.style.overflow = "hidden";
    return () => {
      docEl.style.overflow = previousOverflow;
    };
  }, [sheet]);

  // Sync filters when the URL query changes (back/forward, category links).
  // Render-phase adjustment instead of setState-in-effect: re-runs immediately
  // without an extra committed render pass.
  const query = searchParams.toString();
  const [prevQuery, setPrevQuery] = useState(query);
  useEffect(() => {
    searchQueryRef.current = query;
  }, [query]);
  if (query !== prevQuery) {
    setPrevQuery(query);
    const next = filtersFromSearchParams(new URLSearchParams(query));
    if (!filtersEqual(filters, next)) setFilters(next);
  }

  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }
    if (pathname !== "/products") return;

    const params = searchParamsFromFilters(filters);
    const query = params.toString();
    if (query === searchQueryRef.current) return;

    searchQueryRef.current = query;
    const href = query ? `${pathname}?${query}` : pathname;
    let cancelled = false;
    startTransition(() => {
      if (cancelled) return;
      router.push(href, { scroll: false });
    });
    return () => {
      cancelled = true;
    };
  }, [filters, pathname, router, startTransition]);

  const updateFilters = (partial: Partial<FilterState>) => {
    setFilters((current) => {
      const next = { ...current, ...partial };
      if (partial.category !== undefined && partial.category !== current.category) {
        next.subcategory = "";
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters(defaultFilterState);
    setSheet(null);
  };

  const removeChip = (key: string) => {
    switch (key) {
      case "category":
        updateFilters({ category: "all", subcategory: "" });
        break;
      case "subcategory":
        updateFilters({ subcategory: "" });
        break;
      case "search":
        updateFilters({ search: "" });
        break;
      case "price":
        updateFilters({ priceRange: "all" });
        break;
      case "stock":
        updateFilters({ inStockOnly: false });
        break;
      case "customizable":
        updateFilters({ customizableOnly: false });
        break;
      case "bulk":
        updateFilters({ bulkOnly: false });
        break;
      default:
        break;
    }
  };

  const results = useMemo(() => filterProducts(undefined, filters), [filters]);

  // Incremental rendering: 24 at a time; resets whenever the filters change.
  const filterKey = JSON.stringify(filters);
  const [page, setPage] = useState({ key: filterKey, count: PAGE_SIZE });
  const visibleCount = page.key === filterKey ? page.count : PAGE_SIZE;
  const visibleResults = results.slice(0, visibleCount);
  const remaining = results.length - visibleResults.length;
  const chips = getActiveFilterChips(filters);
  const subcategories = useMemo(
    () => getSubcategoriesForCategory(filters.category),
    [filters.category],
  );

  const activeCategory = productCategories.find(
    (item) => item.slug === filters.category,
  );
  const occasion = filters.subcategory ? OCCASION_COPY[filters.subcategory] : undefined;
  const headerTitle = filters.subcategory
    ? filters.subcategory
    : filters.category !== "all" && activeCategory
      ? activeCategory.label
      : "Browse Products";
  const headerLead =
    occasion ??
    (filters.category !== "all" && activeCategory
      ? (CATEGORY_COPY[filters.category] ??
        `Shop ${activeCategory.label.toLowerCase()}. Filter by price, stock or customisation.`)
      : "Corporate and occasion gifting, boards and office essentials — for individual orders and bulk requirements.");

  const countLabel =
    filters.search.trim() || chips.length > 0
      ? `${results.length} product${results.length === 1 ? "" : "s"} found`
      : `${results.length} products`;
  const showingLabel = `Showing ${results.length} product${results.length === 1 ? "" : "s"}`;
  // Category selection and search are communicated via the tabs and the search
  // box themselves, so the "active filters" count reflects refinement filters.
  const activeFilterCount = chips.filter(
    (chip) => chip.key !== "category" && chip.key !== "search",
  ).length;
  const activeFilterLabel =
    activeFilterCount === 0
      ? "No active filters"
      : `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`;

  const commitCatalogueSearch = (value: string) => {
    const next = value.trim();
    if (next) addRecentSearch(next);
    updateFilters({ search: next });
  };

  const bannerImage =
    filters.category === "gifts"
      ? "/images/categories/category-gifts.jpg"
      : filters.category === "stationery"
        ? "/images/products/note-book-set-main.png"
        : filters.category === "desk"
          ? "/images/products/wooden-organiser.png"
          : filters.category === "office"
            ? "/images/products/magazine-holder-main.jpg"
            : filters.category === "writing"
              ? "/images/products/parker-vector-pen-main.jpg"
              : filters.category === "presentation"
                ? "/images/products/presentation-folder.jpg"
                : "/images/products/wooden-organiser.png";

  return (
    <div className={styles.page} data-nav-surface="light">
      <header className={styles.banner}>
        <Image
          src={bannerImage}
          loader={shopifyImageLoader(bannerImage)}
          alt=""
          fill
          sizes="100vw"
          className={styles.bannerPhoto}
          priority
        />
        <div className={styles.bannerScrim} aria-hidden />
        <div className={`shell ${styles.header}`}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>{headerTitle}</h1>
            <p className={styles.lead}>{headerLead}</p>
          </div>
          <p className={styles.headerCount} aria-live="polite">
            {countLabel}
          </p>
        </div>
      </header>

      <div className={`shell ${styles.body}`}>
        <div className={styles.categoryBar}>
          <CategoryNav
            value={filters.category}
            onChange={(category: ProductCategorySlug) =>
              updateFilters({ category })
            }
          />
        </div>

        <SubcategoryNav
          options={subcategories}
          value={filters.subcategory}
          onChange={(subcategory) => updateFilters({ subcategory })}
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.countBlock}>
              <p className={styles.count} aria-live="polite">
                {isPending ? "Updating…" : showingLabel}
              </p>
              <p className={styles.activeFilters}>{activeFilterLabel}</p>
            </div>
            <ProductSearch
              value={filters.search}
              onChange={(search) => updateFilters({ search })}
              onSubmit={commitCatalogueSearch}
            />
          </div>

          <div className={styles.toolbarRight}>
            <button
              ref={filterTriggerRef}
              type="button"
              className={`${styles.filtersButton} ${activeFilterCount > 0 ? styles.filtersButtonActive : ""}`}
              onClick={() => setSheet("filters")}
              aria-expanded={sheet === "filters"}
              aria-haspopup="dialog"
            >
              <SlidersIcon />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
            <ProductSort
              value={filters.sort}
              onChange={(sort) => updateFilters({ sort })}
            />
          </div>
        </div>

        {chips.length > 0 ? (
          <div className={styles.chips} aria-label="Active filters">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={styles.chip}
                onClick={() => removeChip(chip.key)}
                aria-label={`Remove filter ${chip.label}`}
              >
                <span className={styles.chipLabel}>{chip.label}</span>
                <span aria-hidden className={styles.chipRemove}>
                  ×
                </span>
              </button>
            ))}
            <button
              type="button"
              className={styles.clear}
              onClick={clearFilters}
            >
              Clear all
            </button>
          </div>
        ) : null}

        <div
          className={styles.results}
          aria-busy={isPending}
          data-pending={isPending ? "true" : undefined}
        >
          {results.length > 0 ? (
            <>
              <ProductGrid products={visibleResults} />
              <div className={styles.loadMore}>
                <p className={styles.loadMoreCount} aria-live="polite">
                  Showing {visibleResults.length} of {results.length} products
                </p>
                <div className={styles.loadMoreTrack} aria-hidden>
                  <span
                    style={{
                      width: `${(visibleResults.length / results.length) * 100}%`,
                    }}
                  />
                </div>
                {remaining > 0 ? (
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() =>
                      setPage({ key: filterKey, count: visibleCount + PAGE_SIZE })
                    }
                  >
                    Load {Math.min(PAGE_SIZE, remaining)} more
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyProductState
              onClear={clearFilters}
              hasSearch={Boolean(filters.search.trim())}
              hasFilters={chips.some((chip) => chip.key !== "search")}
            />
          )}
        </div>
      </div>

      {sheet === "filters" ? (
        <div className={styles.overlay}>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close panel"
            onClick={() => setSheet(null)}
          />
          <div
            ref={sheetRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className={styles.sheetHead}>
              <div>
                <p className={styles.sheetEyebrow}>Refine</p>
                <p className={styles.sheetTitle}>Filters</p>
              </div>
              <button
                type="button"
                className={styles.sheetClose}
                data-sheet-close
                onClick={() => setSheet(null)}
              >
                Close
              </button>
            </div>
            <div className={styles.sheetBody}>
              <ProductFilters filters={filters} onChange={updateFilters} />
            </div>
            <div className={styles.sheetFooter}>
              <button
                type="button"
                className={`btn btn--outline ${styles.sheetReset}`}
                onClick={() => setFilters(defaultFilterState)}
              >
                Clear All
              </button>
              <button
                type="button"
                className={`btn btn--forest ${styles.sheetApply}`}
                onClick={() => setSheet(null)}
              >
                Apply Filters · {results.length}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h13M17 17h3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="15" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="12" r="1.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="19" cy="17" r="1.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
