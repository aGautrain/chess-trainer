import type { CSSProperties } from 'react'

export const lastMoveStyle: CSSProperties = { background: 'rgba(255, 214, 0, 0.45)' }
export const hintStyle: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(40, 140, 255, 0.85)' }
export const selectedStyle: CSSProperties = { background: 'rgba(20, 85, 30, 0.5)' }
export const moveDotStyle: CSSProperties = {
  background: 'radial-gradient(circle, rgba(20, 85, 30, 0.5) 22%, transparent 24%)',
  cursor: 'pointer',
}
export const captureRingStyle: CSSProperties = {
  background: 'radial-gradient(circle, transparent 72%, rgba(20, 85, 30, 0.5) 74%)',
  cursor: 'pointer',
}
