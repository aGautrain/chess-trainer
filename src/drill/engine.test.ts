import { describe, expect, it } from 'vitest'
import { drills, italianGame } from './drills'
import { attemptMove, expectedMove, formatLine, sideToMove, validateDrill } from './engine'
import type { Drill } from './types'

describe('drills', () => {
  it.each(drills.map((d) => [d.id, d] as const))('%s has a legal line', (_, drill) => {
    expect(() => validateDrill(drill)).not.toThrow()
  })
})

describe('attemptMove', () => {
  it('accepts the expected move', () => {
    const result = attemptMove(italianGame, 0, { from: 'f1', to: 'c4' })
    expect(result.kind).toBe('correct')
    expect(result).toMatchObject({ san: 'Bc4' })
  })

  it('rejects a legal move that is off the line', () => {
    expect(attemptMove(italianGame, 0, { from: 'f1', to: 'b5' })).toEqual({ kind: 'wrong', san: 'Bb5' })
  })

  it('reports illegal moves', () => {
    expect(attemptMove(italianGame, 0, { from: 'f1', to: 'f3' })).toEqual({ kind: 'illegal' })
  })

  it('checks moves deeper in the line', () => {
    expect(attemptMove(italianGame, 4, { from: 'd2', to: 'd4' }).kind).toBe('correct')
    expect(attemptMove(italianGame, 8, { from: 'c1', to: 'd2' }).kind).toBe('correct')
    expect(attemptMove(italianGame, 8, { from: 'b1', to: 'd2' })).toEqual({ kind: 'wrong', san: 'Nbd2' })
  })

  it('uses the promotion piece from the line', () => {
    const drill: Drill = {
      id: 'underpromo',
      name: '',
      description: '',
      fen: '8/1P6/8/8/8/8/k7/2K5 w - - 0 1',
      playerColor: 'white',
      line: ['b8=N'],
    }
    expect(attemptMove(drill, 0, { from: 'b7', to: 'b8' })).toMatchObject({ kind: 'correct', san: 'b8=N' })
    expect(attemptMove(drill, 0, { from: 'b7', to: 'b8', promotion: 'q' })).toMatchObject({ kind: 'wrong' })
  })
})

describe('helpers', () => {
  it('reads the side to move', () => {
    expect(sideToMove(italianGame.fen)).toBe('white')
  })

  it('returns null past the end of the line', () => {
    expect(expectedMove(italianGame, italianGame.line.length)).toBeNull()
  })

  it('formats numbered move text', () => {
    expect(formatLine(italianGame, 3)).toBe('3. Bc4 Bc5 4. c3')
  })
})
