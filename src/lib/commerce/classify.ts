/** Maps storefront catalogue data onto the Blueprint's five divisions and budget bands. */
import type { Product } from "@/types/product";

export type Division =
  | "corporate"
  | "promotional"
  | "premium"
  | "personal"
  | "festive";

export type BudgetBand =
  | "under_500"
  | "500_1000"
  | "1000_2500"
  | "2500_5000"
  | "5000_plus";

export function divisionFor(p: Pick<Product, "subcategory" | "categorySlug" | "name">): Division {
  const sub = (p.subcategory ?? "").toLowerCase();
  const name = p.name.toLowerCase();
  if (sub.includes("festive") || /diwali|holi|christmas|eid|rakhi/.test(name))
    return "festive";
  if (sub.includes("wedding") || sub.includes("occasion")) return "personal";
  if (sub.includes("platter") || /hamper|premium|luxury/.test(name))
    return "premium";
  if (sub.includes("corporate")) return "corporate";
  return "promotional";
}

export function budgetBandFor(priceRupees: number): BudgetBand {
  if (priceRupees < 500) return "under_500";
  if (priceRupees < 1000) return "500_1000";
  if (priceRupees < 2500) return "1000_2500";
  if (priceRupees < 5000) return "2500_5000";
  return "5000_plus";
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
