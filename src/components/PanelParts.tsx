import type { ReactNode } from 'react'

/** A drill's description, folded away so the player can try the position before reading how it is done. */
export function Concept({ text }: { text: string }) {
  if (!text) return null
  return (
    <details className="concept">
      <summary>See the concept</summary>
      <p className="description">{text}</p>
    </details>
  )
}

/** A square button showing only an icon, named for screen readers and in a tooltip. */
export function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="icon-button" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}
    </button>
  )
}
