import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { isTag, type Tag } from './drill/tags'

export type Page = 'train' | 'library'

const LIBRARY_PATH = '#/library'

/** The library's filters, search and page, kept after the `?` of its hash, e.g. `#/library?tags=engine,draw&q=rook&page=2`. */
export interface LibraryQuery {
  tags: Tag[]
  q: string
  page: number
}

// The last library hash, so the Library tab reopens the filters you left.
let lastLibraryHash = LIBRARY_PATH

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const currentHash = () => window.location.hash

function pageOf(hash: string): Page {
  return hash === LIBRARY_PATH || hash.startsWith(`${LIBRARY_PATH}?`) ? 'library' : 'train'
}

/** The page shown, kept in the URL hash so it works on GitHub Pages and with the back button, and the Library tab's link. */
export function useHashPage(): [Page, (page: Page) => void, string] {
  const hash = useSyncExternalStore(subscribe, currentHash)
  const page = pageOf(hash)
  useEffect(() => {
    if (page === 'library') lastLibraryHash = hash
  }, [page, hash])
  const go = (next: Page) => {
    if (next === pageOf(currentHash())) return
    window.location.hash = next === 'library' ? lastLibraryHash : '#/'
    window.scrollTo(0, 0)
  }
  return [page, go, page === 'library' ? hash : lastLibraryHash]
}

export function parseLibraryQuery(hash: string): LibraryQuery {
  const at = hash.indexOf('?')
  const params = new URLSearchParams(at >= 0 ? hash.slice(at + 1) : '')
  const tags = [...new Set((params.get('tags') ?? '').split(',').filter(isTag))]
  const page = Number.parseInt(params.get('page') ?? '', 10)
  return { tags, q: params.get('q') ?? '', page: page > 0 ? page : 1 }
}

export function libraryHash({ tags, q, page }: LibraryQuery): string {
  const params = new URLSearchParams()
  if (tags.length) params.set('tags', tags.join(','))
  if (q) params.set('q', q)
  if (page > 1) params.set('page', String(page))
  // Keep the commas in the tag list readable.
  const query = params.toString().replace(/%2C/g, ',')
  return query ? `${LIBRARY_PATH}?${query}` : LIBRARY_PATH
}

/**
 * The library's filters from the URL hash, and a setter that rewrites the hash in place,
 * so typing in the search box does not fill the back button's history.
 */
export function useLibraryQuery(): [LibraryQuery, (next: LibraryQuery) => void] {
  const hash = useSyncExternalStore(subscribe, currentHash)
  const query = useMemo(() => parseLibraryQuery(hash), [hash])
  const set = (next: LibraryQuery) => {
    const target = libraryHash(next)
    if (target === currentHash()) return
    window.history.replaceState(window.history.state, '', target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  return [query, set]
}
