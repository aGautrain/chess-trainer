import { validateDrill } from './engine'
import { GOAL_PIECES } from './goals'
import type { Drill, EngineDrill, EngineGoal, GoalPiece, LineDrill } from './types'

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

function isGoal(value: unknown): value is EngineGoal {
  if (typeof value !== 'object' || value === null) return false
  const g = value as Record<string, unknown>
  if (g.kind === 'checkmate' || g.kind === 'draw') return true
  return g.kind === 'win-piece' && GOAL_PIECES.includes(g.piece as GoalPiece)
}

/** A saved drill, or null when the entry is malformed. Drills saved before engine drills existed have no mode and are line drills. */
function toDrill(value: unknown): Drill | null {
  if (typeof value !== 'object' || value === null) return null
  const d = value as Record<string, unknown>
  const common =
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    typeof d.description === 'string' &&
    typeof d.fen === 'string' &&
    (d.playerColor === 'white' || d.playerColor === 'black')
  if (!common) return null
  if (d.mode === 'engine') {
    if (!isGoal(d.goal)) return null
    // Drills saved before randomizing existed are not randomized.
    const { randomize, ...rest } = d
    return { ...(rest as unknown as EngineDrill), ...(randomize === true ? { randomize: true } : {}) }
  }
  if (d.mode !== undefined && d.mode !== 'line') return null
  if (!Array.isArray(d.line) || !d.line.every((m) => typeof m === 'string')) return null
  return { ...(d as unknown as LineDrill), mode: 'line' }
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
  return parsed.flatMap((entry) => {
    const d = toDrill(entry)
    if (!d) return []
    try {
      validateDrill(d)
      return [d]
    } catch {
      return []
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
