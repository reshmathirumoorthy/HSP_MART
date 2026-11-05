import {
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_STORAGE_KEY,
  sanitizeSearchTerms,
  writeJsonStorage,
} from "@/lib/discovery";

const EMPTY: string[] = [];
const CHANGE_EVENT = "hsp-mart-recent-searches-change";

let cachedSerialized = "__unset__";
let cachedTerms: string[] = EMPTY;

export function emitRecentSearchesChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeRecentSearches(onStoreChange: () => void) {
  const handle = () => onStoreChange();
  window.addEventListener("storage", handle);
  window.addEventListener(CHANGE_EVENT, handle);
  return () => {
    window.removeEventListener("storage", handle);
    window.removeEventListener(CHANGE_EVENT, handle);
  };
}

export function getRecentSearchesSnapshot(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    const serialized = raw ?? "[]";
    if (serialized === cachedSerialized) return cachedTerms;

    const parsed = raw
      ? sanitizeSearchTerms(JSON.parse(raw) as unknown)
      : EMPTY;
    cachedSerialized = serialized;
    cachedTerms = parsed.length === 0 ? EMPTY : parsed;
    return cachedTerms;
  } catch {
    cachedSerialized = "[]";
    cachedTerms = EMPTY;
    return EMPTY;
  }
}

export function getRecentSearchesServerSnapshot() {
  return EMPTY;
}

function commit(next: string[]) {
  const sanitized = sanitizeSearchTerms(next);
  writeJsonStorage(RECENT_SEARCHES_STORAGE_KEY, sanitized);
  cachedSerialized = JSON.stringify(sanitized);
  cachedTerms = sanitized.length === 0 ? EMPTY : sanitized;
  emitRecentSearchesChange();
}

export function addRecentSearch(term: string) {
  const cleaned = term.trim().replace(/\s+/g, " ");
  if (!cleaned) return;
  const current = getRecentSearchesSnapshot();
  const next = [
    cleaned,
    ...current.filter((entry) => entry.toLowerCase() !== cleaned.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);
  commit(next);
}

export function removeRecentSearch(term: string) {
  commit(
    getRecentSearchesSnapshot().filter(
      (entry) => entry.toLowerCase() !== term.toLowerCase(),
    ),
  );
}

export function clearRecentSearches() {
  commit([]);
}
