/**
 * Presentable product name. Some imported Shopify titles are ALL CAPS
 * ("A4 PAPER TRAY, COASTERS, TISU BOX"); set in a didone that reads like a
 * database dump, so mostly-uppercase titles are converted to title case.
 * Codes containing digits (A4, A5, RF003, 9314) are kept as written.
 */
const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

export function displayName(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 6) return name;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  if (upper / letters.length < 0.7) return name;

  let first = true;
  return name.replace(/[A-Za-z0-9®&'’-]+/g, (word) => {
    const out = /\d/.test(word)
      ? word
      : !first && SMALL.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    first = false;
    return out;
  });
}
