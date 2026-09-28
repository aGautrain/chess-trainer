import { Chess, type Square } from 'chess.js'

export interface LegalTarget {
  to: string
  capture: boolean
}

/** Squares the piece on `square` can legally move to in `fen` (none if it's not that side's turn). */
export function legalTargets(fen: string, square: string): LegalTarget[] {
  const moves = new Chess(fen).moves({ square: square as Square, verbose: true })
  // Promotions list one move per piece type; keep one entry per target square.
  const byTarget = new Map<string, LegalTarget>()
  for (const m of moves) byTarget.set(m.to, { to: m.to, capture: m.isCapture() || m.isEnPassant() })
  return [...byTarget.values()]
}
