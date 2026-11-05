#!/usr/bin/env node
/**
 * Safe, reversible helper for HSP Mart localStorage regression work.
 *
 * IMPORTANT:
 * - Prefer an isolated browser profile for destructive tests.
 * - Never clear live storage unless a verified backup exists.
 * - Backup object keys MUST be the real storage keys (hsp-mart-*), never
 *   short aliases like "cart" / "wishlist" / "compare".
 *
 * Storage keys:
 *   localStorage  hsp-mart-cart
 *   localStorage  hsp-mart-wishlist
 *   localStorage  hsp-mart-compare
 *   sessionStorage __hsp_regression_backup__  (optional session hold)
 *
 * Usage (paste in DevTools on the storefront origin only):
 *
 *   // Backup (does not clear)
 *   (() => {
 *     const KEYS = ['hsp-mart-cart','hsp-mart-wishlist','hsp-mart-compare'];
 *     const backup = Object.fromEntries(KEYS.map((k) => [k, localStorage.getItem(k)]));
 *     sessionStorage.setItem('__hsp_regression_backup__', JSON.stringify(backup));
 *     return backup;
 *   })();
 *
 *   // Restore (only after verifying backup JSON)
 *   (() => {
 *     const KEYS = ['hsp-mart-cart','hsp-mart-wishlist','hsp-mart-compare'];
 *     const raw = sessionStorage.getItem('__hsp_regression_backup__');
 *     if (!raw) throw new Error('No __hsp_regression_backup__');
 *     const backup = JSON.parse(raw);
 *     for (const k of KEYS) {
 *       if (!(k in backup)) throw new Error(`Backup missing key ${k}`);
 *       if (backup[k] == null) localStorage.removeItem(k);
 *       else localStorage.setItem(k, backup[k]);
 *     }
 *     for (const ev of ['hsp-mart-cart-change','hsp-mart-wishlist-change','hsp-mart-compare-change']) {
 *       window.dispatchEvent(new Event(ev));
 *     }
 *     return Object.fromEntries(KEYS.map((k) => [k, localStorage.getItem(k)]));
 *   })();
 */

const KEYS = Object.freeze([
  "hsp-mart-cart",
  "hsp-mart-wishlist",
  "hsp-mart-compare",
]);

console.log(`HSP Mart storage keys:\n- ${KEYS.join("\n- ")}`);
console.log(
  "\nOpen this file for copy-paste DevTools backup/restore snippets.",
);
console.log(
  "Do not use short aliases (cart/wishlist/compare) when restoring.",
);
