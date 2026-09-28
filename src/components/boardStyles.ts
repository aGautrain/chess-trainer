import type { CSSProperties } from 'react'

export const lastMoveStyle: CSSProperties = { background: 'rgba(255, 214, 0, 0.45)' }
export const hintStyle: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(40, 140, 255, 0.85)' }
export const selectedStyle: CSSProperties = { background: '#d8c464' }
// Darkens either square colour the same way, so dots and rings read on light and dark squares.
const targetShade = 'rgba(0, 0, 0, 0.14)'
export const moveDotStyle: CSSProperties = {
  background: `radial-gradient(circle, ${targetShade} 23%, transparent 24%)`,
  cursor: 'pointer',
}
export const captureRingStyle: CSSProperties = {
  background: `radial-gradient(circle, transparent 72%, ${targetShade} 74%)`,
  cursor: 'pointer',
}
