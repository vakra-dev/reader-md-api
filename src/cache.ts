const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 1000;

interface CacheEntry {
  markdown: string;
  createdAt: number;
}

const store = new Map<string, CacheEntry>();

export function get(url: string): string | null {
  const entry = store.get(url);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > DEFAULT_TTL_MS) {
    store.delete(url);
    return null;
  }
  return entry.markdown;
}

export function set(url: string, markdown: string): void {
  // Evict oldest if at capacity
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(url, { markdown, createdAt: Date.now() });
}
