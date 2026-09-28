import { describe, expect, it, vi } from 'vitest'
import { computeTarget } from './targets'
import type { EngineDrill } from './types'

const drill: EngineDrill = {
  id: 'kq',
  mode: 'engine',
  name: 'Queen mate',
  description: '',
  fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
  playerColor: 'white',
  goal: { kind: 'checkmate' },
}

describe('computeTarget', () => {
  it('searches each position once and reads the mate score', async () => {
    const search = vi.fn(async () => ({ bestMove: 'd1d4', score: { kind: 'mate', value: 9 } as const, depth: 30, pv: [] }))
    const [a, b] = await Promise.all([computeTarget(drill.fen, 'white', search), computeTarget(drill.fen, 'white', search)])
    expect([a, b]).toEqual([9, 9])
    expect(search).toHaveBeenCalledTimes(1)
  })

  it('gives no target when Stockfish finds no forced mate', async () => {
    const search = vi.fn(async () => ({ bestMove: 'b1c3', score: { kind: 'cp', value: 900 } as const, depth: 40, pv: [] }))
    expect(await computeTarget('8/8/8/4k3/8/8/8/1N2KB2 w - - 0 1', 'white', search)).toBeNull()
  })
})
