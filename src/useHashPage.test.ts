import { describe, expect, it } from 'vitest'
import { libraryHash, parseLibraryQuery } from './useHashPage'

describe('library query in the hash', () => {
  it('round-trips tags, search and page', () => {
    const query = { tags: ['engine' as const, 'draw' as const], q: 'rook & king', page: 2 }
    const hash = libraryHash(query)
    expect(hash).toMatch(/^#\/library\?tags=engine,draw&/)
    expect(parseLibraryQuery(hash)).toEqual(query)
  })

  it('leaves defaults out of the hash', () => {
    expect(libraryHash({ tags: [], q: '', page: 1 })).toBe('#/library')
    expect(parseLibraryQuery('#/library')).toEqual({ tags: [], q: '', page: 1 })
  })

  it('drops unknown tags and bad page numbers', () => {
    expect(parseLibraryQuery('#/library?tags=engine,nope,engine&page=-3')).toEqual({ tags: ['engine'], q: '', page: 1 })
  })
})
