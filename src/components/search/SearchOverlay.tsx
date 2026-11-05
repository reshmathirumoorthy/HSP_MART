"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productCategories } from "@/data/products";
import { getSearchSuggestions } from "@/lib/discovery";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  removeRecentSearch,
  subscribeRecentSearches,
} from "@/lib/recentSearches";
import { SearchResultRow } from "@/components/search/SearchResultRow";
import { trapTabKey } from "@/lib/focusTrap";
import styles from "./SearchOverlay.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type SelectableOption =
  | { type: "product"; key: string; href: string; resultIndex: number }
  | { type: "category"; key: string; href: string; label: string }
  | { type: "recent"; key: string; term: string }
  | { type: "browse"; key: string; href: string; label: string }
  | { type: "view-all"; key: string; href: string };

function SearchGlyph() {
  return (
    <svg
      className={styles.searchGlyph}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchOverlay({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const listboxId = useId();
  const optionIdPrefix = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  const suggestions = useMemo(
    () => getSearchSuggestions(debouncedQuery),
    [debouncedQuery],
  );
  const trimmed = query.trim();
  const suggestionTrimmed = debouncedQuery.trim();

  const browseCategories = useMemo(
    () =>
      productCategories
        .filter((category) => category.slug !== "all")
        .slice(0, 6)
        .map((category) => ({
          slug: category.slug,
          label: category.label,
        })),
    [],
  );

  const options = useMemo((): SelectableOption[] => {
    if (!trimmed) {
      const recentOptions: SelectableOption[] = recent.map((term) => ({
        type: "recent",
        key: `recent:${term.toLowerCase()}`,
        term,
      }));
      if (recentOptions.length > 0) return recentOptions;

      return browseCategories.map((category) => ({
        type: "browse",
        key: `browse:${category.slug}`,
        href: `/products?category=${category.slug}`,
        label: category.label,
      }));
    }

    const next: SelectableOption[] = [];

    suggestions.results.forEach((result, resultIndex) => {
      next.push({
        type: "product",
        key: `product:${result.product.id}`,
        href: result.href,
        resultIndex,
      });
    });

    suggestions.categories.forEach((category) => {
      next.push({
        type: "category",
        key: `category:${category.slug}`,
        href: `/products?category=${category.slug}`,
        label: category.label,
      });
    });

    if (suggestions.hasMore) {
      next.push({
        type: "view-all",
        key: "view-all",
        href: `/search?q=${encodeURIComponent(trimmed)}`,
      });
    }

    return next;
  }, [browseCategories, recent, suggestions, trimmed]);

  const showNoResults =
    trimmed.length > 0 &&
    trimmed === suggestionTrimmed &&
    suggestions.results.length === 0 &&
    suggestions.categories.length === 0;

  const closeAndRestoreFocus = useCallback(() => {
    onClose();
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    window.setTimeout(() => target?.focus(), 0);
  }, [onClose]);

  const closeWithoutRestore = useCallback(() => {
    returnFocusRef.current = null;
    onClose();
  }, [onClose]);

  const goToSearchPage = useCallback(
    (term: string) => {
      const value = term.trim();
      if (!value) return;
      addRecentSearch(value);
      closeWithoutRestore();
      router.push(`/search?q=${encodeURIComponent(value)}`);
    },
    [closeWithoutRestore, router],
  );

  const activateOption = useCallback(
    (option: SelectableOption) => {
      switch (option.type) {
        case "product": {
          const result = suggestions.results[option.resultIndex];
          if (!result) return;
          if (trimmed) addRecentSearch(trimmed);
          closeWithoutRestore();
          router.push(result.href);
          break;
        }
        case "category":
        case "browse":
          if (trimmed) addRecentSearch(trimmed);
          closeWithoutRestore();
          router.push(option.href);
          break;
        case "recent":
          setQuery(option.term);
          setActiveIndex(-1);
          break;
        case "view-all":
          goToSearchPage(trimmed);
          break;
      }
    },
    [
      closeWithoutRestore,
      goToSearchPage,
      router,
      suggestions.results,
      trimmed,
    ],
  );

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const option = options[activeIndex];
    if (!option) return;
    const node = document.getElementById(
      `${optionIdPrefix}-${option.key}`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, optionIdPrefix, options]);

  const moveActive = (direction: 1 | -1) => {
    if (options.length === 0) return;
    setActiveIndex((current) => {
      if (direction > 0) {
        return current < options.length - 1 ? current + 1 : 0;
      }
      return current <= 0 ? options.length - 1 : current - 1;
    });
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }

    if (event.key === "Tab" && panelRef.current) {
      trapTabKey(event.nativeEvent, panelRef.current);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      options[activeIndex] &&
      event.target instanceof HTMLElement &&
      event.target.id === "global-search-input"
    ) {
      // Form submit handler covers input Enter; skip duplicate here.
      return;
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      activateOption(options[activeIndex]);
    }
  };

  if (!open) return null;

  const activeOption = activeIndex >= 0 ? options[activeIndex] : null;
  const activeDescendant = activeOption
    ? `${optionIdPrefix}-${activeOption.key}`
    : undefined;

  return (
    <div className={styles.root} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close search"
        tabIndex={-1}
        onClick={closeAndRestoreFocus}
      />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onPanelKeyDown}
      >
        <div className={styles.header}>
          <p id={titleId} className={styles.label}>
            Search HSP Mart
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={closeAndRestoreFocus}
          >
            Close
          </button>
        </div>

        <form
          className={styles.form}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (activeIndex >= 0 && options[activeIndex]) {
              activateOption(options[activeIndex]);
              return;
            }
            goToSearchPage(query);
          }}
        >
          <label className={styles.srOnly} htmlFor="global-search-input">
            Search products by name, SKU, or category
          </label>
          <div className={styles.field}>
            <SearchGlyph />
            <input
              id="global-search-input"
              ref={inputRef}
              className={styles.input}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
                setActiveIndex(-1);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search by name, SKU, or category…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={!showNoResults && options.length > 0}
              aria-controls={
                !showNoResults && options.length > 0 ? listboxId : undefined
              }
              aria-activedescendant={activeDescendant}
            />
            {query ? (
              <button
                type="button"
                className={styles.clearInput}
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(-1);
                  inputRef.current?.focus();
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>

        <div ref={listRef} className={styles.body}>
          {showNoResults ? (
            <div className={styles.empty} role="status">
              <p className={styles.emptyTitle}>No products found</p>
              <p className={styles.emptyCopy}>
                Nothing matched{" "}
                <span>&ldquo;{trimmed}&rdquo;</span>. Try another term or browse
                the catalogue.
              </p>
              <div className={styles.emptyActions}>
                <button
                  type="button"
                  className="btn btn--dark"
                  onClick={() => {
                    setQuery("");
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                  }}
                >
                  Clear search
                </button>
                <Link
                  href="/products"
                  className="btn btn--ghost-dark"
                  onClick={closeWithoutRestore}
                >
                  Browse all products
                </Link>
              </div>
              <div className={styles.browseBlock}>
                <p className={styles.sectionLabel}>Browse categories</p>
                <ul className={styles.categoryList}>
                  {browseCategories.slice(0, 4).map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={`/products?category=${category.slug}`}
                        className={styles.categoryLink}
                        onClick={closeWithoutRestore}
                      >
                        <span>
                          <span className={styles.categoryEyebrow}>
                            Category
                          </span>
                          <span className={styles.categoryName}>
                            {category.label}
                          </span>
                        </span>
                        <span className={styles.categoryAction}>View</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {!showNoResults ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Search suggestions"
              className={styles.suggestions}
            >
              {suggestions.results.length > 0 ? (
                <section aria-labelledby="search-products-heading">
                  <h2
                    id="search-products-heading"
                    className={styles.sectionLabel}
                  >
                    Products
                  </h2>
                  <ul className={styles.list}>
                    {suggestions.results.map((result) => {
                      const key = `product:${result.product.id}`;
                      const optionIndex = options.findIndex(
                        (option) => option.key === key,
                      );
                      return (
                        <li key={result.product.id} role="presentation">
                          <SearchResultRow
                            result={result}
                            id={`${optionIdPrefix}-${key}`}
                            active={activeIndex === optionIndex}
                            onNavigate={() => {
                              if (trimmed) addRecentSearch(trimmed);
                              closeWithoutRestore();
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {suggestions.categories.length > 0 ? (
                <section aria-labelledby="search-categories-heading">
                  <h2
                    id="search-categories-heading"
                    className={styles.sectionLabel}
                  >
                    Categories
                  </h2>
                  <ul className={styles.categoryList}>
                    {suggestions.categories.map((category) => {
                      const key = `category:${category.slug}`;
                      const optionIndex = options.findIndex(
                        (option) => option.key === key,
                      );
                      return (
                        <li key={category.slug} role="presentation">
                          <Link
                            id={`${optionIdPrefix}-${key}`}
                            href={`/products?category=${category.slug}`}
                            role="option"
                            aria-selected={activeIndex === optionIndex}
                            className={`${styles.categoryLink} ${
                              activeIndex === optionIndex
                                ? styles.optionActive
                                : ""
                            }`}
                            onClick={() => {
                              if (trimmed) addRecentSearch(trimmed);
                              closeWithoutRestore();
                            }}
                          >
                            <span>
                              <span className={styles.categoryEyebrow}>
                                Category
                              </span>
                              <span className={styles.categoryName}>
                                {category.label}
                              </span>
                            </span>
                            <span className={styles.categoryAction}>
                              View category
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {trimmed && suggestions.hasMore ? (
                <div className={styles.viewAllWrap}>
                  <button
                    id={`${optionIdPrefix}-view-all`}
                    type="button"
                    role="option"
                    aria-selected={activeOption?.type === "view-all"}
                    className={`${styles.viewAll} ${
                      activeOption?.type === "view-all"
                        ? styles.optionActive
                        : ""
                    }`}
                    onClick={() => goToSearchPage(trimmed)}
                  >
                    View all results ({suggestions.totalCount})
                  </button>
                </div>
              ) : null}

              {!trimmed && recent.length > 0 ? (
                <section aria-labelledby="recent-searches-heading">
                  <div className={styles.recentHead}>
                    <h2
                      id="recent-searches-heading"
                      className={styles.sectionLabel}
                    >
                      Recent searches
                    </h2>
                    <button
                      type="button"
                      className={styles.clear}
                      onClick={() => clearRecentSearches()}
                    >
                      Clear all
                    </button>
                  </div>
                  <ul className={styles.recentList}>
                    {recent.map((term) => {
                      const key = `recent:${term.toLowerCase()}`;
                      const optionIndex = options.findIndex(
                        (option) => option.key === key,
                      );
                      return (
                        <li
                          key={term}
                          className={styles.recentItem}
                          role="presentation"
                        >
                          <button
                            id={`${optionIdPrefix}-${key}`}
                            type="button"
                            role="option"
                            aria-selected={activeIndex === optionIndex}
                            className={`${styles.recentTerm} ${
                              activeIndex === optionIndex
                                ? styles.optionActive
                                : ""
                            }`}
                            onClick={() => {
                              setQuery(term);
                              setActiveIndex(-1);
                              inputRef.current?.focus();
                            }}
                          >
                            {term}
                          </button>
                          <button
                            type="button"
                            className={styles.recentRemove}
                            aria-label={`Remove recent search ${term}`}
                            onClick={() => removeRecentSearch(term)}
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {!trimmed && recent.length === 0 ? (
                <section aria-labelledby="empty-search-heading">
                  <h2
                    id="empty-search-heading"
                    className={styles.sectionLabel}
                  >
                    Browse categories
                  </h2>
                  <p className={styles.hint}>
                    Search by product name, SKU, or category — or explore below.
                  </p>
                  <ul className={styles.categoryList}>
                    {browseCategories.map((category) => {
                      const key = `browse:${category.slug}`;
                      const optionIndex = options.findIndex(
                        (option) => option.key === key,
                      );
                      return (
                        <li key={category.slug} role="presentation">
                          <Link
                            id={`${optionIdPrefix}-${key}`}
                            href={`/products?category=${category.slug}`}
                            role="option"
                            aria-selected={activeIndex === optionIndex}
                            className={`${styles.categoryLink} ${
                              activeIndex === optionIndex
                                ? styles.optionActive
                                : ""
                            }`}
                            onClick={closeWithoutRestore}
                          >
                            <span>
                              <span className={styles.categoryEyebrow}>
                                Category
                              </span>
                              <span className={styles.categoryName}>
                                {category.label}
                              </span>
                            </span>
                            <span className={styles.categoryAction}>Browse</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
