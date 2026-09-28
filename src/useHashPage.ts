import { useSyncExternalStore } from 'react'

export type Page = 'train' | 'library'

const LIBRARY_HASH = '#/library'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function currentPage(): Page {
  return window.location.hash === LIBRARY_HASH ? 'library' : 'train'
}

/** The page shown, kept in the URL hash so it works on GitHub Pages and with the back button. */
export function useHashPage(): [Page, (page: Page) => void] {
  const page = useSyncExternalStore(subscribe, currentPage)
  const go = (next: Page) => {
    if (next === currentPage()) return
    window.location.hash = next === 'library' ? LIBRARY_HASH : '#/'
    window.scrollTo(0, 0)
  }
  return [page, go]
}
