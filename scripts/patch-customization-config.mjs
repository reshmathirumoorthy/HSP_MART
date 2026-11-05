/**
 * Adds visualizer configs to selected customizable demo products.
 */
import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/data/products.ts");
let text = fs.readFileSync(file, "utf8");

const configs = {
  "insulated-tumbler": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "bottle",
        defaultPlacement: "center",
        placements: ["front", "center", "side"],
        fonts: ["classic", "modern", "bold", "handwritten"],
        colors: ["black", "white", "green", "gold"],
        maxLength: 18,
      },
    }`,
  "executive-notebook": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "notebook",
        defaultPlacement: "cover",
        placements: ["cover", "center"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold"],
        maxLength: 22,
      },
    }`,
  "custom-branded-notebook": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "notebook",
        defaultPlacement: "cover",
        placements: ["cover", "center"],
        fonts: ["classic", "modern", "bold", "handwritten"],
        colors: ["black", "green", "gold", "white"],
        maxLength: 24,
      },
    }`,
  "premium-pen-set": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "pen",
        defaultPlacement: "side",
        placements: ["side", "front"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold"],
        maxLength: 16,
      },
    }`,
  "signature-pen-set": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "pen",
        defaultPlacement: "side",
        placements: ["side", "front"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold"],
        maxLength: 16,
      },
    }`,
  "custom-branded-pen": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "pen",
        defaultPlacement: "side",
        placements: ["side", "front"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold", "white"],
        maxLength: 16,
      },
    }`,
  "corporate-gift-box": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "box",
        defaultPlacement: "center",
        placements: ["center", "front"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold", "white"],
        maxLength: 20,
      },
    }`,
  "executive-gift-set": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "box",
        defaultPlacement: "center",
        placements: ["center", "front"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold"],
        maxLength: 20,
      },
    }`,
  "custom-presentation-folder": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "folder",
        defaultPlacement: "front",
        placements: ["front", "center"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold"],
        maxLength: 24,
      },
    }`,
  "presentation-folder-pack": `{
      enabled: true,
      types: ["text"],
      preview: {
        type: "folder",
        defaultPlacement: "front",
        placements: ["front", "center"],
        fonts: ["classic", "modern", "bold"],
        colors: ["black", "green", "gold"],
        maxLength: 24,
      },
    }`,
};

for (const [slug, config] of Object.entries(configs)) {
  const marker = `slug: "${slug}",`;
  const idx = text.indexOf(marker);
  if (idx === -1) {
    console.warn("missing", slug);
    continue;
  }
  if (text.includes(`slug: "${slug}",`) && text.slice(idx, idx + 800).includes("customization:")) {
    console.log("skip existing", slug);
    continue;
  }

  // Insert after customizationTypes line within this product block
  const blockStart = idx;
  const blockEnd = text.indexOf("\n  },", blockStart);
  const block = text.slice(blockStart, blockEnd);

  if (block.includes("customization:")) {
    console.log("already has", slug);
    continue;
  }

  let nextBlock;
  if (block.includes("customizationTypes:")) {
    nextBlock = block.replace(
      /(customizationTypes: \[[^\]]*\],)/,
      `$1\n    customization: ${config},`,
    );
  } else if (block.includes("customizable: true,")) {
    nextBlock = block.replace(
      /(customizable: true,)/,
      `$1\n    customization: ${config},`,
    );
  } else {
    console.warn("no insert point", slug);
    continue;
  }

  text = text.slice(0, blockStart) + nextBlock + text.slice(blockEnd);
  console.log("patched", slug);
}

fs.writeFileSync(file, text, "utf8");
console.log("done");
