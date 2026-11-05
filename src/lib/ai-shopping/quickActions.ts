/**
 * Quick-start prompts shown above the HSP AI composer.
 * Every prompt is understood by the existing commerce engine.
 */

import type { ChatQuickAction } from "./types";

export const ASSISTANT_QUICK_ACTIONS: ChatQuickAction[] = [
  {
    id: "best-sellers",
    label: "Best Sellers",
    prompt: "Show featured products",
  },
  {
    id: "delivery",
    label: "Delivery Information",
    prompt: "Delivery information",
  },
  {
    id: "bulk",
    label: "Bulk Orders",
    prompt: "I need a bulk quote",
  },
  {
    id: "custom",
    label: "Custom Products",
    prompt: "Show customizable products",
  },
];

export const ASSISTANT_WELCOME =
  "Ask about products, get instant answers!";
