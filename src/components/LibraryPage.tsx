import type { DrillProgress } from '../drill/progress'
import type { Drill } from '../drill/types'
import { drillMeta } from './drillMeta'
import { DrillActions } from './DrillActions'
import { ProgressTag } from './ProgressTag'
import { StarButton } from './StarButton'

interface Props {
  drills: Drill[]
  isStarred: (drill: Drill) => boolean
  isCustom: (drill: Drill) => boolean
  progressOf: (drill: Drill) => DrillProgress | null
  onPlay: (drill: Drill) => void
  onToggleStar: (drill: Drill) => void
  onNew: () => void
  onEdit: (drill: Drill) => void
  onDelete: (drill: Drill) => void
}

/** Every drill, built-in and user-made, as cards to open or star into My drills. */
export function LibraryPage({ drills, isStarred, isCustom, progressOf, onPlay, onToggleStar, onNew, onEdit, onDelete }: Props) {
  return (
    <section aria-labelledby="library-title">
      <div className="library-head page-head">
        <div>
          <h2 id="library-title">Library</h2>
          <p className="description">Open a drill to play it, or star it to keep it in My drills.</p>
        </div>
        <button type="button" className="primary" onClick={onNew}>
          New drill
        </button>
      </div>
      <ul className="drill-cards" data-testid="library">
        {drills.map((drill) => (
          <li key={drill.id} className="drill-card">
            <button type="button" className="drill-card-open" onClick={() => onPlay(drill)} aria-label={`Play ${drill.name}`}>
              <span className="drill-card-name">{drill.name}</span>
              <span className="drill-meta">
                {drillMeta(drill)}
                <ProgressTag progress={progressOf(drill)} />
              </span>
              {drill.description && <span className="drill-card-description">{drill.description}</span>}
              <span className="drill-card-source">{isCustom(drill) ? 'Made by you' : 'Built-in'}</span>
            </button>
            <div className="drill-card-star">
              <StarButton name={drill.name} starred={isStarred(drill)} onToggle={() => onToggleStar(drill)} />
            </div>
            {isCustom(drill) && <DrillActions drill={drill} onEdit={onEdit} onDelete={onDelete} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
