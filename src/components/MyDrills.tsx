import type { Drill } from '../drill/types'
import { drillMeta } from './drillMeta'
import { StarButton } from './StarButton'

interface Props {
  /** The starred drills, in the order they were starred. */
  drills: Drill[]
  selectedId: string | null
  isCustom: (drill: Drill) => boolean
  onSelect: (drill: Drill) => void
  onUnstar: (drill: Drill) => void
  onNew: () => void
  onEdit: (drill: Drill) => void
  onDelete: (drill: Drill) => void
  onBrowse: () => void
}

export function MyDrills({ drills, selectedId, isCustom, onSelect, onUnstar, onNew, onEdit, onDelete, onBrowse }: Props) {
  return (
    <nav className="library" aria-label="My drills">
      {drills.length === 0 ? (
        <p className="empty">No drills starred yet. Star drills in the Library to train them here.</p>
      ) : (
        <ul data-testid="my-drills">
          {drills.map((drill) => (
            <li key={drill.id} className={drill.id === selectedId ? 'selected' : undefined}>
              <div className="drill-row">
                <button type="button" className="drill-name" onClick={() => onSelect(drill)} aria-current={drill.id === selectedId}>
                  {drill.name}
                  <span className="drill-meta">{drillMeta(drill)}</span>
                </button>
                <StarButton name={drill.name} starred onToggle={() => onUnstar(drill)} />
              </div>
              {isCustom(drill) && <DrillActions drill={drill} onEdit={onEdit} onDelete={onDelete} />}
            </li>
          ))}
        </ul>
      )}
      <div className="library-foot">
        <button type="button" className="primary" onClick={onNew}>
          New drill
        </button>
        <button type="button" onClick={onBrowse}>
          Library
        </button>
      </div>
    </nav>
  )
}

export function DrillActions({ drill, onEdit, onDelete }: { drill: Drill; onEdit: (d: Drill) => void; onDelete: (d: Drill) => void }) {
  return (
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
  )
}
