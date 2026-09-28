import { describe, expect, it } from 'vitest'
import { formatScore, negate, parseBestMove, parseInfo, scoreToCp } from './uci'

describe('parseInfo', () => {
  it('reads depth, score and pv', () => {
    const info = parseInfo('info depth 12 seldepth 18 multipv 1 score cp 34 nodes 1000 nps 5000 pv e2e4 e7e5 g1f3')
    expect(info).toEqual({ depth: 12, multipv: 1, score: { kind: 'cp', value: 34 }, pv: ['e2e4', 'e7e5', 'g1f3'] })
  })

  it('reads mate scores', () => {
    expect(parseInfo('info depth 5 score mate -2 pv h7h8')?.score).toEqual({ kind: 'mate', value: -2 })
  })

  it('ignores bound scores and lines without a score', () => {
    expect(parseInfo('info depth 10 score cp 20 lowerbound nodes 5')).toBeNull()
    expect(parseInfo('info depth 10 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfo('bestmove e2e4')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('reads the move and handles no legal move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
    expect(parseBestMove('bestmove (none)')).toBeNull()
    expect(parseBestMove('info depth 1')).toBeUndefined()
  })
})

describe('scores', () => {
  it('ranks mates above material and shorter mates higher', () => {
    expect(scoreToCp({ kind: 'mate', value: 1 })).toBeGreaterThan(scoreToCp({ kind: 'mate', value: 3 }))
    expect(scoreToCp({ kind: 'mate', value: 3 })).toBeGreaterThan(scoreToCp({ kind: 'cp', value: 5000 }))
    expect(scoreToCp({ kind: 'mate', value: -1 })).toBeLessThan(scoreToCp({ kind: 'cp', value: -5000 }))
    expect(scoreToCp({ kind: 'mate', value: 0 })).toBeLessThan(scoreToCp({ kind: 'mate', value: -1 }))
  })

  it('negates and formats', () => {
    expect(negate({ kind: 'cp', value: 35 })).toEqual({ kind: 'cp', value: -35 })
    expect(formatScore({ kind: 'cp', value: 135 })).toBe('+1.35')
    expect(formatScore({ kind: 'cp', value: -20 })).toBe('-0.20')
    expect(formatScore({ kind: 'mate', value: 3 })).toBe('#3')
  })
})
