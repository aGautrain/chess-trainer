import { describe, expect, it } from 'vitest'
import { FAVORITES_KEY, loadFavorites, saveFavorites, toggleFavorite } from './favorites'

function memoryStore(initial?: string) {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(FAVORITES_KEY, initial)
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('favorite drills', () => {
  it('round-trips starred ids', () => {
    const store = memoryStore()
    expect(saveFavorites(['a', 'b'], store)).toBe(true)
    expect(loadFavorites(store)).toEqual(['a', 'b'])
  })

  it('tells a never-saved list apart from an empty one', () => {
    expect(loadFavorites(memoryStore())).toBeNull()
    expect(loadFavorites(null)).toBeNull()
    expect(loadFavorites(memoryStore('[]'))).toEqual([])
  })

  it('ignores corrupt data and drops non-string or repeated ids', () => {
    expect(loadFavorites(memoryStore('{not json'))).toBeNull()
    expect(loadFavorites(memoryStore('{"a":1}'))).toBeNull()
    expect(loadFavorites(memoryStore('["a", 1, null, "a", "b"]'))).toEqual(['a', 'b'])
  })

  it('reports a refused save', () => {
    expect(saveFavorites(['a'], null)).toBe(false)
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } }
    expect(saveFavorites(['a'], full)).toBe(false)
  })

  it('toggles an id on and off', () => {
    expect(toggleFavorite(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleFavorite(['a', 'b'], 'a')).toEqual(['b'])
  })
})
