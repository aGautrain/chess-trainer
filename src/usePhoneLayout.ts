import { useSyncExternalStore } from 'react'

/**
 * Phones, upright or on their side. Must match the media query of the phone layout in index.css:
 * there the top bar goes, and the board comes first with its controls right under it.
 */
export const PHONE_QUERY = '(max-width: 640px), (max-height: 500px)'

function query(): MediaQueryList | null {
  return typeof window === 'undefined' || !window.matchMedia ? null : window.matchMedia(PHONE_QUERY)
}

function subscribe(onChange: () => void) {
  const list = query()
  list?.addEventListener('change', onChange)
  return () => list?.removeEventListener('change', onChange)
}

/** Whether the phone layout is in use; follows rotation and window resizes. */
export function usePhoneLayout(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false)
}
