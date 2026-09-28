import { useEffect, useRef } from 'react'
import type { Drill } from '../drill/types'
import { drillMeta } from './drillMeta'

interface Props {
  /** The starred drills, in the order they were starred. */
  drills: Drill[]
  selectedId: string | null
  onSelect: (drill: Drill) => void
  onNew: () => void
  onBrowse: () => void
}

/** The starred drills to pick from while training. Starring, editing and deleting happen in the Library. */
export function MyDrills({ drills, selectedId, onSelect, onNew, onBrowse }: Props) {
  const list = useRef<HTMLUListElement>(null)

  // On narrow screens the list scrolls sideways: keep the drill being trained in view.
  useEffect(() => {
    const current = list.current?.querySelector<HTMLElement>('li.selected')
    const ul = list.current
    if (current && ul && ul.scrollWidth > ul.clientWidth) {
      ul.scrollTo({ left: current.offsetLeft - ul.offsetLeft - 12 })
    }
  }, [selectedId])

  return (
    <nav className="library" aria-label="My drills">
      {drills.length === 0 ? (
        <p className="empty">No drills starred yet. Star drills in the Library to train them here.</p>
      ) : (
        <ul ref={list} data-testid="my-drills">
          {drills.map((drill) => (
            <li key={drill.id} className={drill.id === selectedId ? 'selected' : undefined}>
              <button type="button" className="drill-name" onClick={() => onSelect(drill)} aria-current={drill.id === selectedId}>
                {drill.name}
                <span className="drill-meta">{drillMeta(drill)}</span>
              </button>
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
