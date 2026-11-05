/**
 * Lightweight HSP AI engine smoke tests (no external AI).
 * Usage: npx tsx --tsconfig tsconfig.json scripts/verify-ai-shopping.ts
 */

import { runAssistantEngine } from "../src/lib/ai-shopping/engine";
import { createEmptyConversationContext } from "../src/lib/ai-shopping/types";
import { parseAssistantQuery } from "../src/lib/ai-shopping/parser";

const emptyRuntime = {
  cartLines: [] as {
    productId: string;
    name: string;
    quantity: number;
    lineTotal: number;
    lineKey: string;
  }[],
  cartSubtotal: 0,
  wishlistNames: [] as string[],
  wishlistIds: [] as string[],
};

const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (!condition) failures.push(label);
  else console.log(`✓ ${label}`);
}

{
  const q = parseAssistantQuery("Do you have pencil box sets?");
  assert(q.intent === "SEARCH_PRODUCTS", "intent: pencil box search");
}

{
  const q = parseAssistantQuery("Show products under 500");
  assert(
    q.intent === "FILTER_PRODUCTS" || q.intent === "SEARCH_PRODUCTS",
    "intent: under 500",
  );
  assert(q.priceMax === 500, "entity: priceMax 500");
}

{
  const q = parseAssistantQuery("Add the first one to my cart");
  assert(q.intent === "ADD_TO_CART", "intent: add to cart");
  assert(q.ordinal === 1, "entity: first ordinal");
}

{
  const q = parseAssistantQuery("Add 3 of the second one");
  assert(q.intent === "ADD_TO_CART", "intent: add qty");
  assert(q.ordinal === 2, "entity: second ordinal");
  assert(q.quantity === 3, "entity: quantity 3");
}

{
  const q = parseAssistantQuery("I need 50 notebooks for bulk order");
  assert(
    q.intent === "BULK_PURCHASE" ||
      q.intent === "BULK_QUOTE" ||
      q.intent === "SEARCH_PRODUCTS",
    "intent: bulk notebooks",
  );
  assert(q.quantity === 50, "entity: quantity 50");
  assert(q.bulkIntent === true, "entity: bulkIntent");
}

let context = createEmptyConversationContext(null);

{
  const result = runAssistantEngine(
    "Show stationery",
    context,
    emptyRuntime,
  );
  assert(
    (result.message.products?.length ?? 0) > 0,
    "search: stationery returns real products",
  );
  assert(
    (result.message.products ?? []).every((p) => Boolean(p.id && p.price >= 0)),
    "search: products have real ids/prices",
  );
  context = result.nextContext;
}

{
  const result = runAssistantEngine(
    "Which is cheapest?",
    context,
    emptyRuntime,
  );
  assert(
    (result.message.products?.length ?? 0) > 0,
    "sort: cheapest uses prior results",
  );
  const prices = (result.message.products ?? []).map((p) => p.price);
  assert(
    prices.length > 0 && prices[0] === Math.min(...prices),
    "sort: first card is cheapest among returned",
  );
  context = result.nextContext;
}

{
  const result = runAssistantEngine(
    "Add the first one to my cart",
    context,
    emptyRuntime,
  );
  assert(
    result.pendingActions.some((a) => a.type === "add_to_cart"),
    "action: add first pending add_to_cart",
  );
  const add = result.pendingActions.find((a) => a.type === "add_to_cart");
  assert(
    Boolean(add && add.type === "add_to_cart" && add.productId),
    "action: add_to_cart has productId",
  );
}

{
  const result = runAssistantEngine(
    "zzzz-not-a-real-product-xyz",
    createEmptyConversationContext(null),
    emptyRuntime,
  );
  assert(
    !result.message.products?.length ||
      result.message.text.toLowerCase().includes("couldn't find") ||
      result.message.text.toLowerCase().includes("couldn’t find") ||
      result.message.text.toLowerCase().includes("close"),
    "empty: honest no/near-match response",
  );
  assert(
    !(result.message.products ?? []).some((p) => p.id.startsWith("fake-")),
    "empty: never invents product ids",
  );
}

console.log("");
if (failures.length) {
  console.log("FAIL:");
  for (const f of failures) console.log(`- ${f}`);
  process.exit(1);
}

console.log("PASS: HSP AI shopping engine smoke tests");
process.exit(0);
