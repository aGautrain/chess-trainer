import { validateDrill } from './engine'
import type { Drill } from './types'

export const STORAGE_KEY = 'chess-trainer.customDrills.v1'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

/** localStorage, or null when it is unavailable (private mode, blocked site data, tests). */
function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function isDrill(value: unknown): value is Drill {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    typeof d.description === 'string' &&
    typeof d.fen === 'string' &&
    (d.playerColor === 'white' || d.playerColor === 'black') &&
    Array.isArray(d.line) &&
    d.line.every((m) => typeof m === 'string')
  )
}

/** Reads the user's saved drills, skipping any entry that is malformed or no longer legal. */
export function loadCustomDrills(store: KeyValueStore | null = defaultStore()): Drill[] {
  let raw: string | null = null
  try {
    raw = store?.getItem(STORAGE_KEY) ?? null
  } catch {
    return []
  }
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.filter((d): d is Drill => {
    if (!isDrill(d)) return false
    try {
      validateDrill(d)
      return true
    } catch {
      return false
    }
  })
}

/** Saves the user's drills. Returns false if the browser refused (storage full or blocked). */
export function saveCustomDrills(drills: Drill[], store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(drills))
    return true
  } catch {
    return false
  }
}

export function newDrillId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  return `custom-${random}`
}
