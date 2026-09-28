import { Chess, type Move } from 'chess.js'
import type { Color, Drill } from './types'

export interface MoveAttempt {
  from: string
  to: string
  promotion?: string
}

export type AttemptResult =
  | { kind: 'illegal' }
  | { kind: 'wrong'; san: string }
  | { kind: 'correct'; san: string; fen: string }

/** Replays the first `ply` moves of the drill line and returns the resulting game. */
export function positionAt(drill: Drill, ply: number): Chess {
  const game = new Chess(drill.fen)
  for (const san of drill.line.slice(0, ply)) game.move(san)
  return game
}

/** Throws if the drill's FEN or any move of its line is invalid. */
export function validateDrill(drill: Drill): void {
  const game = new Chess(drill.fen)
  drill.line.forEach((san, i) => {
    try {
      game.move(san)
    } catch {
      throw new Error(`Drill "${drill.id}": move ${i + 1} (${san}) is illegal`)
    }
  })
}

export function sideToMove(fen: string): Color {
  return new Chess(fen).turn() === 'w' ? 'white' : 'black'
}

/** The expected move at `ply`, or null when the line is finished. */
export function expectedMove(drill: Drill, ply: number): Move | null {
  const san = drill.line[ply]
  if (san === undefined) return null
  return positionAt(drill, ply).move(san)
}

/** Checks a move the user tried at `ply` against the drill line. */
export function attemptMove(drill: Drill, ply: number, attempt: MoveAttempt): AttemptResult {
  const game = positionAt(drill, ply)
  const expected = expectedMove(drill, ply)
  // Promote to whatever the line expects when the squares match, otherwise a queen.
  const promotion =
    attempt.promotion ??
    (expected && expected.from === attempt.from && expected.to === attempt.to ? expected.promotion : undefined) ??
    'q'

  let played: Move
  try {
    played = game.move({ from: attempt.from, to: attempt.to, promotion })
  } catch {
    return { kind: 'illegal' }
  }
  if (!expected || played.san !== expected.san) return { kind: 'wrong', san: played.san }
  return { kind: 'correct', san: played.san, fen: game.fen() }
}

/** Formats the line up to `ply` as numbered move text, e.g. "3. Bc4 Bc5 4. c3". */
export function formatLine(drill: Drill, ply: number): string {
  const start = new Chess(drill.fen)
  let moveNumber = start.moveNumber()
  let white = start.turn() === 'w'
  const parts: string[] = []
  drill.line.slice(0, ply).forEach((san, i) => {
    if (white) parts.push(`${moveNumber}. ${san}`)
    else {
      parts.push(i === 0 ? `${moveNumber}... ${san}` : san)
      moveNumber++
    }
    white = !white
  })
  return parts.join(' ')
}
