import type { ReactNode } from 'react'
import { LibraryBig } from 'lucide-react'

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

/**
 * A square button showing only an icon, named for screen readers and in a tooltip.
 * `labelled` also writes the name under the icon, for the bigger controls under the board on phones.
 */
export function IconButton({
  label,
  onClick,
  disabled,
  labelled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  labelled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={labelled ? 'icon-button labelled' : 'icon-button'}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
      {labelled && <span aria-hidden>{label}</span>}
    </button>
  )
}

/** The drill's name, with a way to the Library on phones, where the top bar is gone. */
export function PanelTitle({ name, phone }: { name: string; phone: boolean }) {
  return (
    <div className="panel-head">
      <h2>{name}</h2>
      {phone && (
        <a className="icon-link" href="#/library" aria-label="Library" title="Library">
          <LibraryBig aria-hidden size={20} />
        </a>
      )}
    </div>
  )
}
