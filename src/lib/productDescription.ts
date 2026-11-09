/**
 * Turns plain catalogue descriptions (imported from Shopify HTML) into
 * readable blocks: paragraphs and lists. Handles inline numbered runs such as
 * "Content :- 1. Tray 2. Three jars 3. Dry fruits" and "• item" lines.
 */

export type DescriptionBlock =
  | { type: "p"; text: string }
  | { type: "list"; title?: string; items: string[] };

const INLINE_NUMBER = /(?:^|\s)(\d{1,2})[.)]\s+/g;
const LEAD_LABEL = /^([A-Za-z][A-Za-z ]{1,30})\s*[:：]-?\s*/;

function splitInlineNumbered(line: string): { title?: string; items: string[] } | null {
  const matches = [...line.matchAll(INLINE_NUMBER)];
  if (matches.length < 2) return null;

  const firstIndex = matches[0].index ?? 0;
  let title = line.slice(0, firstIndex).trim().replace(/[:：]-?\s*$/, "").trim();
  const items: string[] = [];
  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? line.length) : line.length;
    const item = line.slice(start, end).trim().replace(/[.,;]\s*$/, "");
    if (item) items.push(item);
  });
  if (title.length > 40) title = "";
  return items.length >= 2 ? { title: title || undefined, items } : null;
}

export function parseDescription(text: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  let bullets: string[] = [];
  let pendingTitle: string | undefined;

  const flush = () => {
    if (bullets.length) {
      blocks.push({ type: "list", title: pendingTitle, items: bullets });
      pendingTitle = undefined;
    }
    bullets = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("•")) {
      bullets.push(line.replace(/^•\s*/, ""));
      continue;
    }
    // One numbered item per line: "1. Tray", "2) Jars", "3 Filled with…"
    const lineItem = line.match(/^(\d{1,2})[.)]?\s+(.+)$/);
    if (lineItem && (bullets.length > 0 || /^\d{1,2}[.)]/.test(line))) {
      bullets.push(lineItem[2].trim().replace(/[.,;]\s*$/, ""));
      continue;
    }
    flush();

    // A bare label line ("Content :-", "Features:") introduces the next list.
    const label = line.match(/^([A-Za-z][A-Za-z &]{1,30})\s*[:：]-?\s*$/);
    if (label) {
      if (pendingTitle) blocks.push({ type: "p", text: pendingTitle });
      pendingTitle = label[1].trim();
      continue;
    }
    if (pendingTitle) {
      blocks.push({ type: "p", text: `${pendingTitle}:` });
      pendingTitle = undefined;
    }

    const numbered = splitInlineNumbered(line);
    if (numbered) {
      blocks.push({ type: "list", ...numbered });
      continue;
    }
    blocks.push({ type: "p", text: line });
  }
  flush();
  if (pendingTitle) blocks.push({ type: "p", text: pendingTitle });
  return blocks;
}

/**
 * A one-line summary that is never junk like "1." — falls back to the first
 * meaningful sentence / list items of the description.
 */
export function productSummary(shortDescription: string, description: string, name: string): string {
  const clean = shortDescription.trim();
  if (clean.length >= 16 && !/^\d{1,2}[.)]?(\s|$)/.test(clean)) return clean;

  for (const block of parseDescription(description)) {
    if (block.type === "p") {
      const text = block.text.replace(LEAD_LABEL, "").trim();
      if (text.length >= 16 && text !== name) {
        return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
      }
    } else {
      const joined = block.items.slice(0, 3).join(" · ");
      return joined.length > 160 ? `${joined.slice(0, 157).trimEnd()}…` : joined;
    }
  }
  return "";
}
