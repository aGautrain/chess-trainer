import { Chess, type Square } from 'chess.js'
import { winChance } from '../engine/judge'
import { scoreToCp, type Score } from '../engine/uci'
import type { Color } from './types'

const FILES = 'abcdefgh'

/** Random number in [0, 1), injectable so tests are repeatable. */
export type Rng = () => number

const isLight = (square: string) => (FILES.indexOf(square[0]) + Number(square[1])) % 2 === 1

/**
 * The same pieces as `fen` on random squares, with the same side to move, or null when no attempt gave a legal position.
 * Pawns stay off the first and last ranks and bishops keep the colour of their square (so two bishops can still mate).
 * The result is a playable start: nobody is in check and the game is not over. Castling and en passant are dropped.
 */
export function shufflePieces(fen: string, rng: Rng = Math.random, attempts = 200): string | null {
  const source = new Chess(fen)
  const pieces = source.board().flat().filter((p) => p !== null)
  // Place the most constrained pieces first.
  const order = [...pieces].sort((a, b) => rank(a.type) - rank(b.type))
  const turn = source.turn()

  for (let i = 0; i < attempts; i++) {
    const free = new Set<string>(FILES.split('').flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}`)))
    const game = new Chess()
    game.clear()
    let placed = true
    for (const piece of order) {
      const options = [...free].filter((sq) => {
        if (piece.type === 'p' && (sq[1] === '1' || sq[1] === '8')) return false
        if (piece.type === 'b' && isLight(sq) !== isLight(piece.square)) return false
        return true
      })
      if (options.length === 0) {
        placed = false
        break
      }
      const square = options[Math.floor(rng() * options.length)]
      free.delete(square)
      game.put({ type: piece.type, color: piece.color }, square as Square)
    }
    if (!placed) continue
    const candidate = `${game.fen().split(' ')[0]} ${turn} - - 0 1`
    if (playable(candidate)) return candidate
  }
  return null
}

function rank(type: string): number {
  return type === 'p' ? 0 : type === 'b' ? 1 : type === 'k' ? 3 : 2
}

/** Neither king is in check (kings touching counts) and the side to move has a move that is not a draw. */
function playable(fen: string): boolean {
  let game: Chess
  try {
    game = new Chess(fen)
  } catch {
    return false
  }
  for (const color of ['w', 'b'] as const) {
    const king = game.findPiece({ type: 'k', color })[0]
    if (king && game.isAttacked(king, color === 'w' ? 'b' : 'w')) return false
  }
  return !game.isGameOver()
}

/** How far a shuffled position may drift from the original, in points of the player's winning chances (0 to 100). */
export const WIN_CHANCE_TOLERANCE = 8

/** The player's winning chances for a score given from the side to move's point of view. */
function playerChance(score: Score, fen: string, playerColor: Color): number {
  const mover = fen.split(' ')[1] === 'w' ? 'white' : 'black'
  const cp = scoreToCp(score)
  return winChance(mover === playerColor ? cp : -cp)
}

/** A forced mate for the player in this many moves or fewer is too quick to be a drill. */
const MIN_MATE_MOVES = 3

function mateForPlayer(score: Score, fen: string, playerColor: Color): number | null {
  if (score.kind !== 'mate' || score.value === 0) return null
  const mover = fen.split(' ')[1] === 'w' ? 'white' : 'black'
  const forMover = score.value > 0
  return forMover === (mover === playerColor) ? Math.abs(score.value) : null
}

/**
 * Whether a shuffled position keeps the drill's evaluation: the player's winning chances stay within the tolerance,
 * and it does not hand the player a mate much shorter than the original had.
 */
export function keepsEvaluation(
  original: { fen: string; score: Score },
  candidate: { fen: string; score: Score },
  playerColor: Color,
): boolean {
  const before = playerChance(original.score, original.fen, playerColor)
  const after = playerChance(candidate.score, candidate.fen, playerColor)
  if (Math.abs(before - after) > WIN_CHANCE_TOLERANCE) return false
  const mate = mateForPlayer(candidate.score, candidate.fen, playerColor)
  const originalMate = mateForPlayer(original.score, original.fen, playerColor)
  if (mate !== null && mate <= MIN_MATE_MOVES && (originalMate === null || originalMate > MIN_MATE_MOVES)) return false
  return true
}

export interface RandomizeOptions {
  rng?: Rng
  /** Shuffled positions to try with the engine before giving up. */
  maxTries?: number
  /** Stop trying after this long, in milliseconds. */
  budgetMs?: number
  now?: () => number
}

/**
 * Shuffles the pieces of `fen` until `evaluate` (an engine search, score from the side to move's point of view)
 * rates the new position about the same for the player. Falls back to `fen` when no shuffle passes in time.
 */
export async function randomizePosition(
  fen: string,
  playerColor: Color,
  evaluate: (fen: string) => Promise<Score>,
  { rng = Math.random, maxTries = 40, budgetMs = 6000, now = Date.now }: RandomizeOptions = {},
): Promise<{ fen: string; randomized: boolean }> {
  const started = now()
  const original = { fen, score: await evaluate(fen) }
  for (let i = 0; i < maxTries && now() - started < budgetMs; i++) {
    const candidate = shufflePieces(fen, rng)
    if (!candidate) break
    const score = await evaluate(candidate)
    if (keepsEvaluation(original, { fen: candidate, score }, playerColor)) return { fen: candidate, randomized: true }
  }
  return { fen, randomized: false }
}
