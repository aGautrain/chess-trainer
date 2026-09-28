import { Chess, validateFen, type Square } from 'chess.js'
import type { Color, EngineGoal, GoalPiece } from './types'

export const GOAL_PIECES: GoalPiece[] = ['q', 'r', 'b', 'n', 'p']

export const PIECE_NAMES: Record<GoalPiece, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Short label for the drill list and trainer, e.g. "Win the queen". */
export function goalLabel(goal: EngineGoal): string {
  if (goal.kind === 'checkmate') return 'Checkmate'
  if (goal.kind === 'draw') return 'Hold the draw'
  return `Win a ${PIECE_NAMES[goal.piece]}`
}

const letter = (color: Color) => (color === 'white' ? 'w' : 'b')
const other = (color: Color): Color => (color === 'white' ? 'black' : 'white')

function count(game: Chess, color: 'w' | 'b', type: string): number {
  return game
    .board()
    .flat()
    .filter((p) => p && p.color === color && p.type === type).length
}

/** Material of `color` minus its opponent's, in pawns. */
function balance(game: Chess, color: 'w' | 'b'): number {
  let total = 0
  for (const p of game.board().flat()) if (p) total += (p.color === color ? 1 : -1) * VALUES[p.type]
  return total
}

/**
 * Why the position cannot start an engine drill with this goal, or null when it can.
 * Covers what chess.js' FEN check leaves out: the side not to move in check, and a game that is already over.
 */
export function goalError(fen: string, playerColor: Color, goal: EngineGoal): { field: 'fen' | 'goal'; error: string } | null {
  const error = positionError(fen)
  if (error) return { field: 'fen', error }
  const game = new Chess(fen)
  if (goal.kind === 'win-piece' && count(game, letter(other(playerColor)), goal.piece) === 0) {
    const opponent = other(playerColor) === 'white' ? 'White' : 'Black'
    return { field: 'goal', error: `${opponent} has no ${PIECE_NAMES[goal.piece]} to win.` }
  }
  return null
}

function positionError(fen: string): string | null {
  const check = validateFen(fen)
  if (!check.ok) return (check.error ?? 'Invalid FEN').replace(/^Invalid FEN: /, '')
  let game: Chess
  try {
    game = new Chess(fen)
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  const waiting = game.turn() === 'w' ? 'b' : 'w'
  const king = game.findPiece({ type: 'k', color: waiting })[0] as Square | undefined
  if (king && game.isAttacked(king, game.turn())) {
    return `${waiting === 'w' ? 'White' : 'Black'} is in check but it is not their move.`
  }
  if (game.isGameOver()) return 'The game is already over in this position.'
  return null
}

export type GoalStatus = { state: 'playing' } | { state: 'won' | 'lost'; reason: string }

/**
 * Where an engine drill stands after the moves in `game` (which must start from the drill position).
 * Checkmating the engine always counts as a win; being mated always as a loss; a draw only wins the draw goal.
 * A piece counts as won once the player has captured one of that type, the engine has had its reply,
 * and the player is still ahead in material compared with the start (so a straight trade does not count).
 */
export function goalStatus(game: Chess, playerColor: Color, goal: EngineGoal): GoalStatus {
  const player = letter(playerColor)
  if (game.isCheckmate()) {
    return game.turn() === player
      ? { state: 'lost', reason: 'Checkmate. Stockfish wins.' }
      : { state: 'won', reason: 'Checkmate. You win!' }
  }
  if (game.isGameOver()) {
    const why = game.isStalemate()
      ? 'Stalemate'
      : game.isInsufficientMaterial()
        ? 'Draw by insufficient material'
        : game.isThreefoldRepetition()
          ? 'Draw by repetition'
          : 'Draw by the fifty-move rule'
    return goal.kind === 'draw' ? { state: 'won', reason: `${why}. You held the draw!` } : { state: 'lost', reason: `${why}.` }
  }
  if (goal.kind === 'win-piece' && game.turn() === player) {
    const history = game.history({ verbose: true })
    const captured = history.some((m) => m.color === player && m.captured === goal.piece)
    if (captured) {
      const start = new Chess(history[0]?.before ?? game.fen())
      if (balance(game, player) > balance(start, player)) {
        return { state: 'won', reason: `You won a ${PIECE_NAMES[goal.piece]}!` }
      }
    }
  }
  return { state: 'playing' }
}
