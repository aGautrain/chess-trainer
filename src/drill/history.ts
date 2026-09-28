import { Chess } from 'chess.js'

/** One move of a game's move list, with the move number shown before it, if any ("3." or "3..."). */
export interface NumberedMove {
  san: string
  number: string | null
}

/** Splits SAN moves played from `fen` into numbered moves, e.g. "3." Bc4, Bc5, "4." c3. Same numbering as formatMoves. */
export function numberMoves(fen: string, moves: string[]): NumberedMove[] {
  const start = new Chess(fen)
  let moveNumber = start.moveNumber()
  let white = start.turn() === 'w'
  return moves.map((san, i) => {
    let number: string | null = null
    if (white) number = `${moveNumber}.`
    else {
      if (i === 0) number = `${moveNumber}...`
      moveNumber++
    }
    white = !white
    return { san, number }
  })
}

export type HistoryKey = 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

/** How many moves to show after a history key, out of `total` played. */
export function stepHistory(shown: number, total: number, key: HistoryKey): number {
  switch (key) {
    case 'ArrowLeft':
      return Math.max(0, shown - 1)
    case 'ArrowRight':
      return Math.min(total, shown + 1)
    case 'Home':
      return 0
    case 'End':
      return total
  }
}
