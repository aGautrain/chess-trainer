import type { Drill } from '../drill/types'

/** Edit and Delete for a drill the user made. */
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
