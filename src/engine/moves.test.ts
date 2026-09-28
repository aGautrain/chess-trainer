import { describe, expect, it } from 'vitest'
import { playUci, uciToSan } from './moves'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('playUci', () => {
  it('plays normal moves and promotions', () => {
    expect(playUci(START, 'g1f3')?.move.san).toBe('Nf3')
    expect(playUci('8/1P6/8/8/8/8/k7/2K5 w - - 0 1', 'b7b8n')?.move.san).toBe('b8=N')
  })

  it('rejects illegal moves', () => {
    expect(playUci(START, 'e2e5')).toBeNull()
    expect(uciToSan(START, 'e2e5')).toBe('e2e5')
  })
})
