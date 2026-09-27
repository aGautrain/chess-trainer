import type { Drill } from '../drill/types'

interface Props {
  builtIn: Drill[]
  custom: Drill[]
  selectedId: string | null
  onSelect: (drill: Drill) => void
  onNew: () => void
  onEdit: (drill: Drill) => void
  onDelete: (drill: Drill) => void
}

export function DrillLibrary({ builtIn, custom, selectedId, onSelect, onNew, onEdit, onDelete }: Props) {
  const item = (drill: Drill, editable: boolean) => (
    <li key={drill.id} className={drill.id === selectedId ? 'selected' : undefined}>
      <button type="button" className="drill-name" onClick={() => onSelect(drill)} aria-current={drill.id === selectedId}>
        {drill.name}
        <span className="drill-meta">
          {drill.line.length} moves · as {drill.playerColor}
        </span>
      </button>
      {editable && (
        <span className="drill-actions">
          <button type="button" className="small" onClick={() => onEdit(drill)} aria-label={`Edit ${drill.name}`}>
            Edit
          </button>
          <button
            type="button"
            className="small danger"
            onClick={() => {
              if (window.confirm(`Delete "${drill.name}"?`)) onDelete(drill)
            }}
            aria-label={`Delete ${drill.name}`}
          >
            Delete
          </button>
        </span>
      )}
    </li>
  )

  return (
    <nav className="library" aria-label="Drills">
      <div className="library-head">
        <h2>Drills</h2>
        <button type="button" className="primary" onClick={onNew}>
          New drill
        </button>
      </div>
      <h3>Built-in</h3>
      <ul>{builtIn.map((d) => item(d, false))}</ul>
      <h3>My drills</h3>
      {custom.length === 0 ? (
        <p className="empty">No custom drills yet. Create one from a FEN or a PGN line.</p>
      ) : (
        <ul data-testid="custom-drills">{custom.map((d) => item(d, true))}</ul>
      )}
    </nav>
  )
}
