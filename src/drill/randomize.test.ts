import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { keepsEvaluation, randomizePosition, shufflePieces } from './randomize'

/** A small repeatable random number generator. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    return seed / 2 ** 31
  }
}

const pieces = (fen: string) =>
  new Chess(fen)
    .board()
    .flat()
    .filter((p) => p !== null)
    .map((p) => p.color + p.type)
    .sort()

describe('shufflePieces', () => {
  const fen = '8/8/8/4k3/8/8/2P5/2B1KB2 w - - 0 1'
  const rng = seeded(7)

  it('keeps the material and side to move and gives a playable position', () => {
    for (let i = 0; i < 50; i++) {
      const shuffled = shufflePieces(fen, rng)
      expect(shuffled).not.toBeNull()
      const game = new Chess(shuffled!)
      expect(pieces(shuffled!)).toEqual(pieces(fen))
      expect(game.turn()).toBe('w')
      expect(game.inCheck()).toBe(false)
      expect(game.isGameOver()).toBe(false)
    }
  })

  it('keeps pawns off the back ranks and bishops on their square colour', () => {
    for (let i = 0; i < 50; i++) {
      const game = new Chess(shufflePieces(fen, rng)!)
      const pawn = game.findPiece({ type: 'p', color: 'w' })[0]
      expect(['1', '8']).not.toContain(pawn[1])
      const bishops = game.findPiece({ type: 'b', color: 'w' }).map((sq) => game.squareColor(sq)).sort()
      expect(bishops).toEqual(['dark', 'light'])
    }
  })

  it('never leaves the side not to move in check', () => {
    for (let i = 0; i < 50; i++) {
      const game = new Chess(shufflePieces('8/8/8/4k3/8/8/8/3QK3 b - - 0 1', rng)!)
      const king = game.findPiece({ type: 'k', color: 'w' })[0]
      expect(game.isAttacked(king, 'b')).toBe(false)
    }
  })
})

describe('keepsEvaluation', () => {
  const white = '8/8/8/4k3/8/8/8/3QK3 w - - 0 1'
  const black = '8/8/8/4k3/8/8/8/3QK3 b - - 0 1'

  it('compares scores from the player side', () => {
    const original = { fen: white, score: { kind: 'cp', value: 50 } } as const
    expect(keepsEvaluation(original, { fen: white, score: { kind: 'cp', value: 70 } }, 'white')).toBe(true)
    expect(keepsEvaluation(original, { fen: white, score: { kind: 'cp', value: 400 } }, 'white')).toBe(false)
    // Black to move at -60 is White at +60.
    expect(keepsEvaluation(original, { fen: black, score: { kind: 'cp', value: -60 } }, 'white')).toBe(true)
  })

  it('keeps a long mate but refuses a stalemate-ish draw or a quick mate', () => {
    const original = { fen: white, score: { kind: 'mate', value: 9 } } as const
    expect(keepsEvaluation(original, { fen: white, score: { kind: 'mate', value: 7 } }, 'white')).toBe(true)
    expect(keepsEvaluation(original, { fen: white, score: { kind: 'cp', value: 0 } }, 'white')).toBe(false)
    expect(keepsEvaluation(original, { fen: white, score: { kind: 'mate', value: 2 } }, 'white')).toBe(false)
  })
})

describe('randomizePosition', () => {
  const fen = '8/8/8/4k3/8/8/8/3QK3 w - - 0 1'

  it('returns the first shuffle the engine rates about the same', async () => {
    let calls = 0
    const result = await randomizePosition(fen, 'white', async () => (calls++ === 1 ? { kind: 'cp', value: 0 } : { kind: 'mate', value: 9 }), {
      rng: seeded(3),
    })
    expect(result.randomized).toBe(true)
    expect(result.fen).not.toBe(fen)
    expect(calls).toBe(3)
  })

  it('falls back to the original position when no shuffle passes', async () => {
    let calls = 0
    const result = await randomizePosition(fen, 'white', async () => (calls++ === 0 ? { kind: 'mate', value: 9 } : { kind: 'cp', value: 0 }), {
      rng: seeded(3),
      maxTries: 5,
    })
    expect(result).toEqual({ fen, randomized: false })
    expect(calls).toBe(6)
  })
})
