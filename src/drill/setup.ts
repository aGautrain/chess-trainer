// Free piece placement for the engine drill editor. Works on the FEN board field directly,
// so positions that are not legal yet (a missing king while the user sets up) can still be edited.

import { DEFAULT_POSITION } from 'chess.js'
import type { Color } from './types'

export const EMPTY_BOARD = '8/8/8/8/8/8/8/8'

type Board = (string | null)[][]

const FILES = 'abcdefgh'

/** Rows from rank 8 down to rank 1, each from file a to h; null for empty squares. */
function parseBoard(placement: string): Board {
  const rows = placement.split('/')
  const board: Board = []
  for (let r = 0; r < 8; r++) {
    const row: (string | null)[] = []
    for (const ch of rows[r] ?? '') {
      if (/[1-8]/.test(ch)) for (let i = 0; i < Number(ch); i++) row.push(null)
      else if (/[prnbqkPRNBQK]/.test(ch)) row.push(ch)
    }
    board.push([...row, ...Array<null>(8).fill(null)].slice(0, 8))
  }
  return board
}

function boardToPlacement(board: Board): string {
  return board
    .map((row) => {
      let out = ''
      let empty = 0
      for (const p of row) {
        if (p) {
          if (empty) out += empty
          out += p
          empty = 0
        } else empty++
      }
      return empty ? out + empty : out
    })
    .join('/')
}

function index(square: string): [number, number] {
  return [8 - Number(square[1]), FILES.indexOf(square[0])]
}

/** Castling rights for every king and rook still on its home square. */
function castling(board: Board): string {
  const at = (sq: string) => {
    const [r, f] = index(sq)
    return board[r][f]
  }
  let rights = ''
  if (at('e1') === 'K') {
    if (at('h1') === 'R') rights += 'K'
    if (at('a1') === 'R') rights += 'Q'
  }
  if (at('e8') === 'k') {
    if (at('h8') === 'r') rights += 'k'
    if (at('a8') === 'r') rights += 'q'
  }
  return rights || '-'
}

function toFen(board: Board, turn: Color): string {
  return `${boardToPlacement(board)} ${turn === 'white' ? 'w' : 'b'} ${castling(board)} - 0 1`
}

/** The editor's FEN field, or the standard start when it is empty. */
export function setupFen(fen: string): string {
  return fen.trim() || DEFAULT_POSITION
}

/** The side to move written in `fen`, white when missing. */
export function setupTurn(fen: string): Color {
  return setupFen(fen).split(/\s+/)[1] === 'b' ? 'black' : 'white'
}

/** The board part of `fen` normalised, for the board preview. */
export function setupPlacement(fen: string): string {
  return boardToPlacement(parseBoard(setupFen(fen).split(/\s+/)[0]))
}

/**
 * Applies one edit to the position: `piece` (a FEN letter such as "Q" or "n") lands on `to`,
 * coming from `from` when it was already on the board. `to` null removes it from the board.
 */
export function editSetup(fen: string, edit: { piece: string; from?: string | null; to: string | null }): string {
  const board = parseBoard(setupFen(fen).split(/\s+/)[0])
  if (edit.from) {
    const [r, f] = index(edit.from)
    board[r][f] = null
  }
  if (edit.to) {
    const [r, f] = index(edit.to)
    board[r][f] = edit.piece
  }
  return toFen(board, setupTurn(fen))
}

/** The same position with another side to move. */
export function withTurn(fen: string, turn: Color): string {
  return toFen(parseBoard(setupFen(fen).split(/\s+/)[0]), turn)
}

/** A position with only the given placement, e.g. EMPTY_BOARD. */
export function fromPlacement(placement: string, turn: Color = 'white'): string {
  return toFen(parseBoard(placement), turn)
}
