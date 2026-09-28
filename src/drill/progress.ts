import type { Score } from '../engine/uci'
import type { Color, Drill, EngineDrill } from './types'

export const PROGRESS_KEY = 'chess-trainer.progress.v1'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** What the player has done on one drill, and how short Stockfish says it can be done. */
export interface DrillProgress {
  /** The drill content this was recorded against, so editing a drill starts it over. */
  signature: string
  /** Fixed drills: fewest of the player's own moves in a successful finish. */
  best?: number
  /** Fixed drills: Stockfish's mate-in-N from the start, in the player's moves. Null when it found no forced mate; missing when not computed yet. */
  target?: number | null
  /**
   * Randomized drills, where every run has its own shortest mate: the fewest moves a successful finish took beyond
   * Stockfish's mate-in-N for that run's position. 0 means a run matched Stockfish.
   */
  bestOver?: number
}

/** Progress by drill id. */
export type ProgressMap = Record<string, DrillProgress>

/** The parts of a drill that change what "fewest moves" means. */
export function drillSignature(drill: EngineDrill): string {
  return `${drill.fen}|${drill.playerColor}|${JSON.stringify(drill.goal)}`
}

/** Engine drills keep their best result. */
export function tracksBest(drill: Drill): drill is EngineDrill {
  return drill.mode === 'engine'
}

/** Only a checkmate goal has a move count Stockfish can prove, as a mate score. */
export function hasTarget(drill: Drill): drill is EngineDrill {
  return drill.mode === 'engine' && drill.goal.kind === 'checkmate'
}

/** A fixed drill always starts from the same position, so its target is worth keeping. */
export function storesTarget(drill: Drill): drill is EngineDrill {
  return hasTarget(drill) && !drill.randomize
}

/** The progress recorded for this drill as it is now, or null. */
export function progressFor(map: ProgressMap, drill: Drill): DrillProgress | null {
  if (!tracksBest(drill)) return null
  const entry = map[drill.id]
  return entry && entry.signature === drillSignature(drill) ? entry : null
}

function update(map: ProgressMap, drill: EngineDrill, change: Partial<DrillProgress>): ProgressMap {
  const current = progressFor(map, drill) ?? { signature: drillSignature(drill) }
  return { ...map, [drill.id]: { ...current, ...change } }
}

/**
 * Records a successful finish in `moves` player moves, kept only if it beats the best so far.
 * A randomized drill compares runs by moves beyond the run's own target, so it needs that target.
 */
export function withResult(map: ProgressMap, drill: Drill, moves: number, target: number | null = null): ProgressMap {
  if (!tracksBest(drill)) return map
  const current = progressFor(map, drill)
  if (drill.randomize) {
    if (target === null) return map
    const over = Math.max(0, moves - target)
    return current?.bestOver !== undefined && current.bestOver <= over ? map : update(map, drill, { bestOver: over })
  }
  return current?.best !== undefined && current.best <= moves ? map : update(map, drill, { best: moves })
}

export function withTarget(map: ProgressMap, drill: Drill, target: number | null): ProgressMap {
  return storesTarget(drill) ? update(map, drill, { target }) : map
}

/** Whether the drill was once finished in as few moves as Stockfish's mate. */
export function isCompleted(progress: DrillProgress | null): boolean {
  if (!progress) return false
  if (progress.bestOver !== undefined) return progress.bestOver === 0
  return progress.best !== undefined && typeof progress.target === 'number' && progress.best <= progress.target
}

export function withoutDrill(map: ProgressMap, id: string): ProgressMap {
  if (!(id in map)) return map
  const { [id]: _removed, ...rest } = map
  return rest
}

/**
 * The forced mate for the player in `score` (from the side to move's point of view), counted in the player's moves,
 * or null when the score is not a mate for the player.
 */
export function mateTarget(score: Score, fen: string, playerColor: Color): number | null {
  if (score.kind !== 'mate' || score.value === 0) return null
  const playerToMove = (fen.split(' ')[1] === 'w') === (playerColor === 'white')
  // "mate N" for the side to move is N of its moves; "mate -N" means the opponent mates on its Nth move.
  const forPlayer = playerToMove ? score.value > 0 : score.value < 0
  return forPlayer ? Math.abs(score.value) : null
}

const plural = (n: number) => `${n} move${n === 1 ? '' : 's'}`

/** The Library card tag: Completed, or the best result so far ("Best 20 moves", "Best 2 moves over"), or nothing. */
export function summarize(progress: DrillProgress | null): { completed: boolean; text: string } | null {
  if (!progress) return null
  if (isCompleted(progress)) return { completed: true, text: 'Completed' }
  if (progress.bestOver !== undefined) return { completed: false, text: `Best ${plural(progress.bestOver)} over` }
  if (progress.best !== undefined) return { completed: false, text: `Best ${plural(progress.best)}` }
  return null
}

export function loadProgress(store: KeyValueStore | null = defaultStore()): ProgressMap {
  let raw: string | null = null
  try {
    raw = store?.getItem(PROGRESS_KEY) ?? null
  } catch {
    return {}
  }
  if (raw === null) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  const map: ProgressMap = {}
  const count = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value !== 'object' || value === null) continue
    const e = value as Record<string, unknown>
    if (typeof e.signature !== 'string') continue
    const entry: DrillProgress = { signature: e.signature }
    if (count(e.best)) entry.best = e.best as number
    if (e.target === null || count(e.target)) entry.target = e.target as number | null
    if (typeof e.bestOver === 'number' && Number.isInteger(e.bestOver) && e.bestOver >= 0) entry.bestOver = e.bestOver
    map[id] = entry
  }
  return map
}

/** Saves progress. Returns false if the browser refused. */
export function saveProgress(map: ProgressMap, store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return false
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(map))
    return true
  } catch {
    return false
  }
}
