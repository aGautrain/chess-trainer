import { Chess, DEFAULT_POSITION, validateFen } from 'chess.js'
import { formatLine, sideToMove } from './engine'
import type { Color, Drill } from './types'

/** Raw values from the drill editor form. */
export interface DrillInput {
  name: string
  description: string
  /** Starting position in FEN. Empty means the standard starting position (or the PGN's own FEN header). */
  fen: string
  /** The line to drill: PGN movetext ("1. e4 e5 2. Nf3") or a full PGN with headers. */
  moves: string
  /** The side the user plays, or 'auto' for the side to move in the starting position. */
  playerColor: Color | 'auto'
}

export type DrillField = 'name' | 'fen' | 'moves'

export type BuildResult = { ok: true; drill: Drill } | { ok: false; field: DrillField; error: string }

function fail(field: DrillField, error: string): BuildResult {
  return { ok: false, field, error }
}

/** Parses and validates editor input into a drill. Checks the position and line errors before the name. */
export function buildDrill(input: DrillInput, id: string): BuildResult {
  const fen = input.fen.trim()
  if (fen) {
    const check = validateFen(fen)
    if (!check.ok) return fail('fen', `Invalid FEN: ${check.error}`)
  }

  let pgn = input.moves.trim()
  const headerFen = /\[\s*FEN\s+"([^"]*)"\s*\]/i.exec(pgn)?.[1]?.trim()
  if (fen && headerFen && new Chess(fen).fen() !== new Chess(headerFen).fen()) {
    return fail('fen', 'The FEN field and the PGN [FEN] header describe different positions. Clear one of them.')
  }
  if (fen && !headerFen) pgn = `[SetUp "1"]\n[FEN "${fen}"]\n\n${pgn}`

  const game = new Chess()
  try {
    game.loadPgn(pgn)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const move = /Invalid move in PGN: (\S+)/.exec(message)?.[1]
    return fail('moves', move ? `${move} is not a legal move at that point in the line.` : `Could not read the moves: ${message}`)
  }

  const startFen = game.getHeaders().FEN ?? DEFAULT_POSITION
  const line = game.history()
  if (line.length === 0) return fail('moves', 'Enter at least one move to drill.')

  const toMove = sideToMove(startFen)
  const playerColor = input.playerColor === 'auto' ? toMove : input.playerColor
  if (playerColor !== toMove && line.length < 2) {
    return fail('moves', `You play ${playerColor}, so the line needs at least one ${playerColor} move after ${toMove}'s first move.`)
  }

  const name = input.name.trim()
  if (!name) return fail('name', 'Give the drill a name.')

  return { ok: true, drill: { id, name, description: input.description.trim(), fen: startFen, playerColor, line } }
}

/** Editor values for an existing drill, so it can be edited and saved again. */
export function drillToInput(drill: Drill): DrillInput {
  return {
    name: drill.name,
    description: drill.description,
    fen: drill.fen === DEFAULT_POSITION ? '' : drill.fen,
    moves: formatLine(drill, drill.line.length),
    playerColor: drill.playerColor,
  }
}
