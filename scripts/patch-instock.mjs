import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}

walk(root);

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  // Replace product.inStock checks with isInStock(product) where obvious
  text = text.replace(/!product\.inStock/g, "!isInStock(product)");
  text = text.replace(/product\.inStock \?/g, "isInStock(product) ?");
  text = text.replace(/product\.inStock &&/g, "isInStock(product) &&");
  text = text.replace(/&& product\.inStock/g, "&& isInStock(product)");
  text = text.replace(/\|\| !product\.inStock/g, "|| !isInStock(product)");
  text = text.replace(/filters\.inStockOnly && !product\.inStock/g, "filters.inStockOnly && !isInStock(product)");
  text = text.replace(/product\.minimumOrderQuantity/g, "product.minOrderQuantity");
  text = text.replace(/unavailable: !product\.inStock/g, "unavailable: !isInStock(product)");

  if (text !== original) {
    // Ensure import exists when isInStock is used
    if (text.includes("isInStock(") && !text.includes('from "@/lib/productAvailability"')) {
      if (text.includes('from "@/data/products"')) {
        text = text.replace(
          /import ([\s\S]*?) from "@\/data\/products";/,
          (match) => `${match}\nimport { isInStock } from "@/lib/productAvailability";`,
        );
      } else if (text.includes('from "@/types/product"')) {
        text = text.replace(
          /import ([\s\S]*?) from "@\/types\/product";/,
          (match) => `${match}\nimport { isInStock } from "@/lib/productAvailability";`,
        );
      } else {
        text = `import { isInStock } from "@/lib/productAvailability";\n` + text;
      }
    }
    fs.writeFileSync(file, text, "utf8");
    console.log("patched", path.relative(process.cwd(), file));
  }
}
