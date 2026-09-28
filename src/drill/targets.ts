import type { SearchLimits, SearchResult } from '../engine/stockfish'
import { mateTarget } from './progress'
import type { Color } from './types'

/**
 * Think time for the target search. Mate scores shorten as Stockfish searches deeper; 10 s finds the mates
 * with queen, rooks and two bishops from the built-in positions. Bishop and knight usually shows no mate score
 * without tablebases, so that drill gets no target.
 */
export const TARGET_MOVETIME_MS = 10_000

type Search = (fen: string, limits: SearchLimits) => Promise<SearchResult>

const pending = new Map<string, Promise<number | null>>()

/**
 * Stockfish's mate-in-N for the player from `fen`, or null when it finds no forced mate.
 * One search per position per page load, however many times it is asked for.
 */
export function computeTarget(fen: string, playerColor: Color, search: Search): Promise<number | null> {
  const key = `${fen}|${playerColor}`
  let result = pending.get(key)
  if (!result) {
    result = search(fen, { movetime: TARGET_MOVETIME_MS }).then(({ score }) => mateTarget(score, fen, playerColor))
    pending.set(key, result)
  }
  return result
}
