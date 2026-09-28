import { DEFAULT_POSITION } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { EMPTY_BOARD, editSetup, fromPlacement, setupPlacement, setupTurn, withTurn } from './setup'

describe('setup editing', () => {
  it('moves, adds and removes pieces', () => {
    const moved = editSetup('', { piece: 'P', from: 'e2', to: 'e4' })
    expect(moved).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1')
    const added = editSetup(fromPlacement(EMPTY_BOARD), { piece: 'q', to: 'd5' })
    expect(setupPlacement(added)).toBe('8/8/8/3q4/8/8/8/8')
    const removed = editSetup(added, { piece: 'q', from: 'd5', to: null })
    expect(setupPlacement(removed)).toBe(EMPTY_BOARD)
  })

  it('drops castling rights once a king or rook leaves home', () => {
    const fen = editSetup(DEFAULT_POSITION, { piece: 'R', from: 'h1', to: null })
    expect(fen.split(' ')[2]).toBe('Qkq')
  })

  it('switches the side to move', () => {
    expect(setupTurn(withTurn('', 'black'))).toBe('black')
    expect(setupTurn('')).toBe('white')
  })
})
