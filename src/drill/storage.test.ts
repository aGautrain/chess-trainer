import { describe, expect, it } from 'vitest'
import { italianGame } from './drills'
import { STORAGE_KEY, loadCustomDrills, newDrillId, saveCustomDrills } from './storage'

function memoryStore(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(STORAGE_KEY, initial)
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('custom drill storage', () => {
  it('round-trips drills', () => {
    const store = memoryStore()
    const drill = { ...italianGame, id: 'custom-1' }
    expect(saveCustomDrills([drill], store)).toBe(true)
    expect(loadCustomDrills(store)).toEqual([drill])
  })

  it('returns nothing when storage is empty, missing or corrupt', () => {
    expect(loadCustomDrills(memoryStore())).toEqual([])
    expect(loadCustomDrills(null)).toEqual([])
    expect(loadCustomDrills(memoryStore('{not json'))).toEqual([])
    expect(loadCustomDrills(memoryStore('{"a":1}'))).toEqual([])
  })

  it('skips malformed and illegal entries but keeps valid ones', () => {
    const good = { ...italianGame, id: 'custom-good' }
    const illegal = { ...italianGame, id: 'custom-bad', line: ['Ke3'] }
    const store = memoryStore(JSON.stringify([good, { id: 'x' }, illegal, null]))
    expect(loadCustomDrills(store)).toEqual([good])
  })

  it('loads drills saved before modes existed as line drills', () => {
    const { mode: _mode, ...legacy } = { ...italianGame, id: 'custom-old' }
    expect(loadCustomDrills(memoryStore(JSON.stringify([legacy])))).toEqual([{ ...legacy, mode: 'line' }])
  })

  it('keeps engine drills and drops ones with an unknown goal', () => {
    const engine = {
      id: 'custom-engine',
      mode: 'engine',
      name: 'KQ vs K',
      description: '',
      fen: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
      playerColor: 'white',
      goal: { kind: 'checkmate' },
    }
    const badGoal = { ...engine, id: 'custom-bad-goal', goal: { kind: 'win-piece', piece: 'k' } }
    expect(loadCustomDrills(memoryStore(JSON.stringify([engine, badGoal])))).toEqual([engine])
  })

  it('loads engine drills saved before randomizing existed as not randomized, and keeps the choice once set', () => {
    const engine = {
      id: 'custom-engine',
      mode: 'engine',
      name: 'KQ vs K',
      description: '',
      fen: '4k3/8/8/8/8/8/8/3QK3 w - - 0 1',
      playerColor: 'white',
      goal: { kind: 'checkmate' },
    }
    const randomized = { ...engine, id: 'custom-random', randomize: true }
    const junk = { ...engine, id: 'custom-junk', randomize: 'yes' }
    const loaded = loadCustomDrills(memoryStore(JSON.stringify([engine, randomized, junk])))
    expect(loaded.map((d) => d.mode === 'engine' && d.randomize === true)).toEqual([false, true, false])
  })

  it('reports a failed save', () => {
    const store = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') } }
    expect(saveCustomDrills([italianGame], store)).toBe(false)
    expect(saveCustomDrills([italianGame], null)).toBe(false)
  })

  it('makes unique custom ids', () => {
    const a = newDrillId()
    expect(a).toMatch(/^custom-/)
    expect(newDrillId()).not.toBe(a)
  })
})
