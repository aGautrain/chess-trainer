import { describe, expect, it } from 'vitest'
import { legalTargets } from './legalMoves'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('legalTargets', () => {
  it('lists the knight and pawn moves from the start position', () => {
    expect(legalTargets(START, 'g1').map((t) => t.to).sort()).toEqual(['f3', 'h3'])
    expect(legalTargets(START, 'e2').map((t) => t.to).sort()).toEqual(['e3', 'e4'])
  })

  it('returns nothing for empty squares or the side not to move', () => {
    expect(legalTargets(START, 'e4')).toEqual([])
    expect(legalTargets(START, 'e7')).toEqual([])
  })

  it('flags captures, including en passant', () => {
    const fen = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3'
    expect(legalTargets(fen, 'e5')).toEqual(
      expect.arrayContaining([
        { to: 'e6', capture: false },
        { to: 'f6', capture: true },
      ]),
    )
  })

  it('collapses promotion choices into one target', () => {
    const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1'
    expect(legalTargets(fen, 'a7')).toEqual([{ to: 'a8', capture: false }])
  })
})
