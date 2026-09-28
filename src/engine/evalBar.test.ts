import { describe, expect, it } from 'vitest'
import { evalBarState } from './evalBar'

const cp = (value: number) => ({ kind: 'cp' as const, value })
const mate = (value: number) => ({ kind: 'mate' as const, value })

describe('evalBarState', () => {
  it('is half filled at equality', () => {
    expect(evalBarState(cp(0), 'w')).toEqual({ whitePercent: 50, label: '0.0', favours: 'white' })
  })

  it('reads scores from the side to move', () => {
    const white = evalBarState(cp(50), 'w')
    expect(white.favours).toBe('white')
    expect(white.label).toBe('0.5')
    expect(white.whitePercent).toBeGreaterThan(50)

    const black = evalBarState(cp(50), 'b')
    expect(black.favours).toBe('black')
    expect(black.label).toBe('0.5')
    expect(black.whitePercent).toBeCloseTo(100 - white.whitePercent)
  })

  it('never fills the bar completely without a mate', () => {
    expect(evalBarState(cp(5000), 'w').whitePercent).toBeLessThan(100)
    expect(evalBarState(cp(5000), 'b').whitePercent).toBeGreaterThan(0)
  })

  it('shows forced mates for the right side', () => {
    expect(evalBarState(mate(3), 'w')).toEqual({ whitePercent: 100, label: 'M3', favours: 'white' })
    expect(evalBarState(mate(3), 'b')).toEqual({ whitePercent: 0, label: 'M3', favours: 'black' })
    expect(evalBarState(mate(-2), 'w')).toEqual({ whitePercent: 0, label: 'M2', favours: 'black' })
  })

  it('shows the result once a side is mated', () => {
    expect(evalBarState(mate(0), 'w')).toEqual({ whitePercent: 0, label: '0-1', favours: 'black' })
    expect(evalBarState(mate(0), 'b')).toEqual({ whitePercent: 100, label: '1-0', favours: 'white' })
  })
})
