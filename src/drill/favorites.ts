export const FAVORITES_KEY = 'chess-trainer.favorites.v1'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/**
 * The ids of the drills starred into My drills, in the order they were starred.
 * Returns null when nothing was ever saved, so the caller can pick a first-run default.
 */
export function loadFavorites(store: KeyValueStore | null = defaultStore()): string[] | null {
  let raw: string | null = null
  try {
    raw = store?.getItem(FAVORITES_KEY) ?? null
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string'))]
  } catch {
    return null
  }
}

/** Saves the starred drill ids. Returns false if the browser refused. */
export function saveFavorites(ids: string[], store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return false
  try {
    store.setItem(FAVORITES_KEY, JSON.stringify(ids))
    return true
  } catch {
    return false
  }
}

/** Stars `id` when it is not starred, unstars it otherwise. */
export function toggleFavorite(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}
