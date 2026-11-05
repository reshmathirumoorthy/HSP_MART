/**
 * Query normalization + entity extraction for HSP AI.
 */

import type { ProductCategorySlug } from "@/types/product";
import type { AssistantIntent, AssistantSort, ParsedQuery } from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "me",
  "my",
  "i",
  "im",
  "i'm",
  "please",
  "pls",
  "can",
  "could",
  "would",
  "you",
  "u",
  "do",
  "does",
  "did",
  "have",
  "has",
  "any",
  "some",
  "of",
  "for",
  "to",
  "in",
  "on",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "with",
  "and",
  "or",
  "it",
  "this",
  "that",
  "those",
  "these",
  "from",
  "into",
  "about",
  "looking",
  "look",
  "want",
  "wanna",
  "need",
  "needed",
  "get",
  "got",
  "give",
  "find",
  "show",
  "search",
  "buy",
  "purchase",
  "order",
  "available",
  "availability",
  "something",
  "ones",
  "one",
  "set",
  "sets",
]);

const CATEGORY_ALIASES: { slug: ProductCategorySlug; terms: string[] }[] = [
  {
    slug: "stationery",
    terms: ["stationery", "stationeries", "paper", "notebook", "notebooks", "pad", "pads", "sticky"],
  },
  {
    slug: "office",
    terms: ["office", "workplace", "file", "files", "folder", "folders", "tray", "organizer", "organiser"],
  },
  {
    slug: "desk",
    terms: ["desk", "desktop", "workspace", "holder", "stand", "organizer", "organiser", "calendar"],
  },
  {
    slug: "writing",
    terms: ["writing", "pen", "pens", "pencil", "pencils", "marker", "markers", "gel"],
  },
  {
    slug: "presentation",
    terms: ["presentation", "portfolio", "conference", "meeting", "binder", "report"],
  },
  {
    slug: "gifts",
    terms: [
      "gift",
      "gifts",
      "gifting",
      "corporate gift",
      "corporate gifts",
      "hamper",
      "hampers",
      "tumbler",
      "bottle",
      "bottles",
    ],
  },
  {
    slug: "custom",
    terms: ["custom", "branded", "personalised", "personalized"],
  },
];

const COLOR_TERMS = [
  "black",
  "blue",
  "green",
  "red",
  "pink",
  "white",
  "brown",
  "gold",
  "silver",
  "grey",
  "gray",
  "orange",
  "yellow",
  "purple",
  "navy",
  "beige",
] as const;

const ORDINAL_MAP: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  sixth: 6,
  "6th": 6,
  seventh: 7,
  "7th": 7,
  eighth: 8,
  "8th": 8,
};

export function normalizeAssistantQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[₹$]/g, "rs ")
    .replace(/[^\p{L}\p{N}\s.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function extractQuantity(normalized: string): number | undefined {
  const patterns = [
    /\b(\d{1,4})\s*(?:pieces?|pcs?|units?|qty|quantity|nos?|of\s+(?:these|them|those|it))?\b/,
    /\b(?:qty|quantity|need|want|order)\s*(?:of\s*)?(\d{1,4})\b/,
    /\bfor\s+(\d{1,4})\s+(?:employees?|people|staff|team|members?)\b/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value <= 9999) return value;
  }
  return undefined;
}

function extractPriceBounds(normalized: string): {
  priceMin?: number;
  priceMax?: number;
} {
  const between = normalized.match(
    /\bbetween\s+(?:rs\s*)?(\d+)\s*(?:and|to|-)\s*(?:rs\s*)?(\d+)/,
  );
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    return { priceMin: Math.min(a, b), priceMax: Math.max(a, b) };
  }

  const under = normalized.match(
    /\b(?:under|below|less than|upto|up to|max|maximum|within)\s*(?:rs\s*)?(\d+)/,
  );
  if (under) return { priceMax: Number(under[1]) };

  const over = normalized.match(
    /\b(?:over|above|more than|min|minimum|at least)\s*(?:rs\s*)?(\d+)/,
  );
  if (over) return { priceMin: Number(over[1]) };

  const rupee = normalized.match(/\brs\s*(\d+)\b/);
  if (rupee && /\bunder\b|\bbelow\b|\bless\b/.test(normalized)) {
    return { priceMax: Number(rupee[1]) };
  }

  return {};
}

function extractColor(normalized: string): string | undefined {
  for (const color of COLOR_TERMS) {
    if (new RegExp(`\\b${color}\\b`).test(normalized)) return color;
  }
  return undefined;
}

function extractCategory(normalized: string): ProductCategorySlug | undefined {
  for (const entry of CATEGORY_ALIASES) {
    if (entry.terms.some((term) => normalized.includes(term))) {
      return entry.slug;
    }
  }
  return undefined;
}

function extractOrdinal(normalized: string): number | undefined {
  for (const [word, value] of Object.entries(ORDINAL_MAP)) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) return value;
  }
  const hash = normalized.match(/\b(?:option|item|product|one)\s*#?\s*(\d+)\b/);
  if (hash) {
    const n = Number(hash[1]);
    if (n >= 1 && n <= 20) return n;
  }
  return undefined;
}

function extractSort(normalized: string): AssistantSort {
  if (
    includesAny(normalized, [
      "cheapest",
      "lowest price",
      "low to high",
      "least expensive",
      "most affordable",
      "budget",
    ])
  ) {
    return "price-asc";
  }
  if (
    includesAny(normalized, [
      "expensive",
      "highest price",
      "high to low",
      "premium",
      "most costly",
    ])
  ) {
    return "price-desc";
  }
  if (includesAny(normalized, ["a to z", "alphabet", "name"])) {
    return "name-asc";
  }
  return "relevance";
}

function detectIntent(normalized: string): AssistantIntent {
  if (
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste)\b/.test(
      normalized,
    ) ||
    normalized === "hi" ||
    normalized === "hello"
  ) {
    return "GREETING";
  }

  if (
    includesAny(normalized, [
      "delivery",
      "deliver",
      "shipping",
      "ship the",
      "dispatch",
      "free shipping",
      "when will",
      "how long",
    ])
  ) {
    return "DELIVERY_INFO";
  }

  if (
    includesAny(normalized, [
      "help",
      "what can you do",
      "how do you work",
      "commands",
    ])
  ) {
    return "HELP";
  }

  if (
    includesAny(normalized, [
      "what's in my cart",
      "whats in my cart",
      "show my cart",
      "view cart",
      "open cart",
      "cart contents",
      "my cart",
    ]) &&
    !includesAny(normalized, ["add", "remove", "update"])
  ) {
    return "VIEW_CART";
  }

  if (
    includesAny(normalized, [
      "my wishlist",
      "show wishlist",
      "view wishlist",
      "saved items",
      "wish list",
    ]) &&
    !includesAny(normalized, ["add", "remove", "save"])
  ) {
    return "VIEW_WISHLIST";
  }

  if (
    includesAny(normalized, [
      "bulk quote",
      "request quote",
      "quotation",
      "get a quote",
    ])
  ) {
    return "BULK_QUOTE";
  }

  if (
    includesAny(normalized, [
      "bulk",
      "wholesale",
      "for employees",
      "for the team",
      "corporate gift",
      "corporate gifts",
    ]) &&
    (extractQuantity(normalized) ?? 0) >= 10
  ) {
    return "BULK_PURCHASE";
  }

  if (
    includesAny(normalized, [
      "customize",
      "customise",
      "customization",
      "customisation",
      "with my logo",
      "add logo",
      "personalize",
      "personalise",
      "can i customize",
      "can i customise",
    ])
  ) {
    return "CUSTOMIZE_PRODUCT";
  }

  if (
    includesAny(normalized, [
      "buy now",
      "purchase",
      "checkout",
      "buy the",
      "buy this",
      "buy it",
      "buy first",
      "buy second",
      "order now",
    ])
  ) {
    return "BUY_NOW";
  }

  if (
    includesAny(normalized, [
      "remove from wishlist",
      "unsave",
      "remove wishlist",
    ])
  ) {
    return "REMOVE_FROM_WISHLIST";
  }

  if (
    includesAny(normalized, [
      "save",
      "wishlist",
      "wish list",
      "add to wishlist",
      "favourite",
      "favorite",
      "heart",
    ])
  ) {
    return "ADD_TO_WISHLIST";
  }

  if (
    includesAny(normalized, [
      "remove from cart",
      "remove it from cart",
      "delete from cart",
      "take out of cart",
    ])
  ) {
    return "REMOVE_FROM_CART";
  }

  if (
    includesAny(normalized, [
      "update quantity",
      "change quantity",
      "set quantity",
      "make quantity",
    ])
  ) {
    return "UPDATE_CART_QUANTITY";
  }

  if (
    includesAny(normalized, [
      "add to cart",
      "add it",
      "add this",
      "add the",
      "add first",
      "add second",
      "add third",
      "put in cart",
      "put into cart",
      "cart it",
    ]) ||
    /\badd\s+\d+\b/.test(normalized)
  ) {
    return "ADD_TO_CART";
  }

  if (
    includesAny(normalized, [
      "similar",
      "like this",
      "more like",
      "related",
      "alternatives",
      "other options",
    ])
  ) {
    return "SIMILAR_PRODUCTS";
  }

  if (
    includesAny(normalized, [
      "tell me about",
      "details",
      "product details",
      "what is this",
      "info on",
      "information about",
    ])
  ) {
    return "PRODUCT_DETAILS";
  }

  if (
    includesAny(normalized, [
      "cheapest",
      "most expensive",
      "sort by",
      "lowest price",
      "highest price",
      "which is cheapest",
      "which one is cheapest",
    ])
  ) {
    return "SORT_PRODUCTS";
  }

  if (
    includesAny(normalized, [
      "under",
      "below",
      "between",
      "above",
      "over",
      "customizable",
      "customisable",
      "in stock",
      "filter",
      "only show",
    ]) &&
    (Boolean(extractPriceBounds(normalized).priceMax) ||
      Boolean(extractPriceBounds(normalized).priceMin) ||
      includesAny(normalized, ["customizable", "customisable", "with logo"]))
  ) {
    return "FILTER_PRODUCTS";
  }

  if (
    includesAny(normalized, [
      "show",
      "find",
      "search",
      "looking for",
      "do you have",
      "have you got",
      "got any",
      "any ",
      "need",
      "want",
      "i need",
      "i want",
      "recommend",
      "suggest",
    ]) ||
    extractCategory(normalized) ||
    normalized.split(" ").length <= 4
  ) {
    return "SEARCH_PRODUCTS";
  }

  return "UNKNOWN";
}

function buildSearchTerms(
  normalized: string,
  intent: AssistantIntent,
  color?: string,
): string {
  let text = normalized;

  const dropPhrases = [
    "do you have",
    "have you got",
    "show me",
    "show",
    "find me",
    "find",
    "search for",
    "search",
    "i need",
    "i want",
    "looking for",
    "please",
    "available",
    "under",
    "below",
    "above",
    "over",
    "between",
    "cheapest",
    "most expensive",
    "customizable",
    "customisable",
    "with logo",
    "personalized",
    "personalised",
    "bulk",
    "add to cart",
    "add the",
    "buy the",
    "buy now",
    "save the",
    "wishlist",
    "first one",
    "second one",
    "third one",
    "which is",
    "which one is",
    "best for",
    "for bulk orders",
    "for office use",
    "for office",
    "corporate gifts for",
    "employees",
  ];

  for (const phrase of dropPhrases) {
    text = text.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
  }

  text = text
    .replace(/\b(?:rs\s*)?\d+\b/g, " ")
    .replace(/\b(?:pieces?|pcs?|units?|qty|quantity)\b/g, " ");

  if (color) {
    text = text.replace(new RegExp(`\\b${color}\\b`, "g"), " ");
  }

  const tokens = text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  // Preserve useful product nouns even if short.
  const kept = tokens.filter(Boolean);
  if (kept.length === 0 && intent === "SEARCH_PRODUCTS") {
    return normalized
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
      .slice(0, 4)
      .join(" ");
  }
  return kept.join(" ").trim();
}

export function parseAssistantQuery(raw: string): ParsedQuery {
  const normalized = normalizeAssistantQuery(raw);
  const intent = detectIntent(normalized);
  const { priceMin, priceMax } = extractPriceBounds(normalized);
  const color = extractColor(normalized);
  const categorySlug = extractCategory(normalized);
  const quantity = extractQuantity(normalized);
  const ordinal = extractOrdinal(normalized);
  const sort = extractSort(normalized);
  const customizableOnly = includesAny(normalized, [
    "customizable",
    "customisable",
    "with logo",
    "personalized",
    "personalised",
    "branded",
  ]);
  const bulkOnly = includesAny(normalized, ["bulk", "wholesale"]);
  const bulkIntent =
    bulkOnly ||
    includesAny(normalized, ["corporate gift", "corporate gifts", "employees"]) ||
    (quantity !== undefined && quantity >= 25);

  const useCurrentProduct =
    includesAny(normalized, [
      "this product",
      "this one",
      "this item",
      "current product",
      "on this page",
    ]) ||
    (/\bthis\b|\bit\b/.test(normalized) &&
      [
        "CUSTOMIZE_PRODUCT",
        "PRODUCT_DETAILS",
        "SIMILAR_PRODUCTS",
        "ADD_TO_CART",
        "BUY_NOW",
        "ADD_TO_WISHLIST",
      ].includes(intent));

  let productRef: string | undefined;
  if (useCurrentProduct) productRef = "this";
  else if (color) productRef = color;
  else if (includesAny(normalized, ["it", "that", "this"])) productRef = "that";

  const searchTerms = buildSearchTerms(normalized, intent, color);

  return {
    raw,
    normalized,
    intent,
    searchTerms,
    categorySlug,
    color,
    priceMin,
    priceMax,
    customizableOnly,
    bulkOnly,
    bulkIntent,
    quantity,
    sort,
    ordinal,
    productRef,
    useCurrentProduct,
  };
}

export { COLOR_TERMS, CATEGORY_ALIASES };
