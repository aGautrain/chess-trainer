import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { goalLabel, goalStatus } from './goals'

function play(fen: string, moves: string[]): Chess {
  const game = new Chess(fen)
  for (const m of moves) game.move(m)
  return game
}

describe('goalStatus', () => {
  const mateIn1 = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'

  it('wins on checkmating the engine whatever the goal', () => {
    for (const goal of [{ kind: 'checkmate' }, { kind: 'draw' }, { kind: 'win-piece', piece: 'p' }] as const) {
      expect(goalStatus(play(mateIn1, ['Ra8#']), 'white', goal)).toMatchObject({ state: 'won' })
    }
  })

  it('loses when the player is mated', () => {
    expect(goalStatus(play(mateIn1, ['Ra8#']), 'black', { kind: 'draw' })).toMatchObject({ state: 'lost' })
  })

  it('wins the draw goal on stalemate and loses the others', () => {
    const game = play('7k/8/6Q1/8/8/8/8/K7 b - - 0 1', [])
    expect(game.isStalemate()).toBe(true)
    expect(goalStatus(game, 'black', { kind: 'draw' })).toMatchObject({ state: 'won' })
    expect(goalStatus(game, 'black', { kind: 'checkmate' })).toMatchObject({ state: 'lost' })
  })

  it('counts a piece as won only after the reply and with a material gain', () => {
    // White can take the loose black queen on d5 with the rook.
    const fen = '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1'
    const goal = { kind: 'win-piece', piece: 'q' } as const
    expect(goalStatus(play(fen, ['Rxd5']), 'white', goal)).toEqual({ state: 'playing' })
    expect(goalStatus(play(fen, ['Rxd5', 'Ke7']), 'white', goal)).toMatchObject({ state: 'won' })
  })

  it('does not count a straight trade', () => {
    // Queen takes queen, the king takes back.
    const fen = '4k3/3q2p1/8/8/8/8/6P1/3QK3 w - - 0 1'
    const goal = { kind: 'win-piece', piece: 'q' } as const
    expect(goalStatus(play(fen, ['Qxd7+', 'Kxd7']), 'white', goal)).toEqual({ state: 'playing' })
  })
})

describe('goalLabel', () => {
  it('names each goal', () => {
    expect(goalLabel({ kind: 'win-piece', piece: 'n' })).toBe('Win a knight')
    expect(goalLabel({ kind: 'draw' })).toBe('Hold the draw')
  })
})
