"use client";

import { useEffect } from "react";
import Image from "next/image";
import { shopifyImageLoader } from "@/lib/imageLoader";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useQuoteSheet } from "@/context/QuoteSheetContext";
import { getProductBySlug } from "@/lib/products";
import { productPriceLabel } from "@/data/products";
import { displayName } from "@/lib/displayName";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import styles from "./QuoteSheet.module.css";

export function QuoteSheet() {
  const { lines, units, isOpen, open, close, setQty, remove, clear, quoteHref } =
    useQuoteSheet();

  // Home masthead: keep floating chrome off the hero plate until it scrolls by.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const masthead = document.getElementById("home-hero-heading")?.closest("section");
      const inView = masthead ? masthead.getBoundingClientRect().bottom > 120 : false;
      if (inView) root.setAttribute("data-masthead-in-view", "");
      else root.removeAttribute("data-masthead-in-view");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const interval = window.setInterval(update, 800); // catches client-side route changes
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearInterval(interval);
      root.removeAttribute("data-masthead-in-view");
    };
  }, []);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
        <SheetContent side="right" className={styles.panel}>
          <SheetHeader className={styles.head}>
            <SheetTitle className={styles.title}>Your quote request</SheetTitle>
            <SheetDescription className={styles.desc}>
              Gather gifts and quantities here, then send a single request.
              Our team confirms pricing, personalisation and delivery.
            </SheetDescription>
          </SheetHeader>

          {lines.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nothing added yet</p>
              <p className={styles.emptyCopy}>
                Use <strong>Add to quote</strong> on any product to start a
                corporate order: festive hampers, welcome kits, client gifts.
              </p>
              <Link
                href={`/products?category=gifts&subcategory=${encodeURIComponent("Corporate Gifting")}`}
                className={styles.emptyLink}
                onClick={close}
              >
                Browse corporate gifts
              </Link>
            </div>
          ) : (
            <ol className={styles.lines}>
              {lines.map((line) => {
                const product = getProductBySlug(line.slug);
                if (!product) return null;
                return (
                  <li key={line.slug} className={styles.line}>
                    <div className={styles.thumb}>
                      {product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          loader={shopifyImageLoader(product.images[0])}
                          alt=""
                          fill
                          sizes="64px"
                          className={styles.thumbImg}
                        />
                      ) : null}
                    </div>
                    <div className={styles.lineBody}>
                      <Link
                        href={`/products/${product.slug}`}
                        className={styles.lineName}
                        onClick={close}
                      >
                        {displayName(product.name)}
                      </Link>
                      <p className={styles.linePrice}>
                        {productPriceLabel(product)}
                        {product.priceOnRequest ? "" : " / unit"}
                      </p>
                    </div>
                    <div className={styles.qty}>
                      <button
                        type="button"
                        aria-label={`Fewer units of ${product.name}`}
                        onClick={() => setQty(line.slug, line.qty - 5)}
                        disabled={line.qty <= 1}
                      >
                        <Minus aria-hidden />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={line.qty}
                        aria-label={`Units of ${product.name}`}
                        onChange={(e) => setQty(line.slug, Number(e.target.value))}
                        data-num
                      />
                      <button
                        type="button"
                        aria-label={`More units of ${product.name}`}
                        onClick={() => setQty(line.slug, line.qty + 5)}
                      >
                        <Plus aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => remove(line.slug)}
                      aria-label={`Remove ${product.name} from quote request`}
                    >
                      <Trash2 aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {lines.length > 0 ? (
            <SheetFooter className={styles.foot}>
              <div className={styles.totals}>
                <span>
                  {lines.length} {lines.length === 1 ? "gift" : "gifts"}
                </span>
                <strong data-num>{units} units</strong>
              </div>
              <Link href={quoteHref} className={styles.submit} onClick={close}>
                Request quote for {units} units
              </Link>
              <button type="button" className={styles.clear} onClick={clear}>
                Clear all
              </button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
