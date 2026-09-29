import { useRef } from 'react'
import type { DrillProgress } from '../drill/progress'
import { availableTags, drillTags, filterDrills, paginate, tagLabel, TAGS, type Tag } from '../drill/tags'
import type { Drill } from '../drill/types'
import { useLibraryQuery } from '../useHashPage'
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

// The card's meta line already says the mode, goal and side, so the card's tags show the rest.
const META_TAGS: Tag[] = ['line', 'engine', 'checkmate', 'draw', 'win-material', 'white', 'black']
const CHIP_ORDER = TAGS.map(({ tag }) => tag)
const byChipOrder = (a: Tag, b: Tag) => CHIP_ORDER.indexOf(a) - CHIP_ORDER.indexOf(b)

/** Every drill, built-in and user-made, as cards to open or star into My drills, with tag filters, search and pages. */
export function LibraryPage({ drills, isStarred, isCustom, progressOf, onPlay, onToggleStar, onNew, onEdit, onDelete }: Props) {
  const [query, setQuery] = useLibraryQuery()
  const listRef = useRef<HTMLDivElement>(null)
  const matching = filterDrills(drills, isCustom, query.tags, query.q)
  const { items, page, pages } = paginate(matching, query.page)
  // A tag stays on the bar while selected, even if the drill carrying it was deleted.
  const chips = availableTags(drills, isCustom)
  for (const tag of query.tags) if (!chips.includes(tag)) chips.push(tag)
  const filtered = query.tags.length > 0 || query.q.trim() !== ''

  const toggleTag = (tag: Tag) =>
    setQuery({ ...query, page: 1, tags: query.tags.includes(tag) ? query.tags.filter((t) => t !== tag) : [...query.tags, tag] })

  function goToPage(next: number) {
    setQuery({ ...query, page: next })
    // Bring the top of the list back into view, below the sticky top bar.
    const top = listRef.current?.getBoundingClientRect().top
    if (top !== undefined && top < 0) window.scrollBy(0, top - 80)
  }

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
      <div className="library-filters" ref={listRef}>
        <input
          type="search"
          className="library-search"
          placeholder="Search drills"
          aria-label="Search drills"
          value={query.q}
          onChange={(e) => setQuery({ ...query, page: 1, q: e.target.value })}
        />
        <div className="tag-chips" role="group" aria-label="Filter by tag">
          {chips.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-chip"
              aria-pressed={query.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tagLabel(tag)}
            </button>
          ))}
        </div>
        <p className="library-count" aria-live="polite">
          {matching.length === drills.length
            ? `${drills.length} drills`
            : `${matching.length} of ${drills.length} drills`}
          {filtered && (
            <button type="button" className="link-button" onClick={() => setQuery({ tags: [], q: '', page: 1 })}>
              Clear filters
            </button>
          )}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="library-empty">No drill matches these filters.</p>
      ) : (
        <ul className="drill-cards" data-testid="library">
          {items.map((drill) => {
            const custom = isCustom(drill)
            const tags = drillTags(drill, custom).filter((t) => !META_TAGS.includes(t)).sort(byChipOrder)
            return (
              <li key={drill.id} className="drill-card">
                <button type="button" className="drill-card-open" onClick={() => onPlay(drill)} aria-label={`Play ${drill.name}`}>
                  <span className="drill-card-name">{drill.name}</span>
                  <span className="drill-meta">
                    {drillMeta(drill)}
                    <ProgressTag progress={progressOf(drill)} />
                  </span>
                  {drill.description && <span className="drill-card-description">{drill.description}</span>}
                  <span className="drill-card-tags">
                    {tags.map((tag) => (
                      <span key={tag} className="drill-card-tag">
                        {tagLabel(tag)}
                      </span>
                    ))}
                  </span>
                </button>
                <div className="drill-card-star">
                  <StarButton name={drill.name} starred={isStarred(drill)} onToggle={() => onToggleStar(drill)} />
                </div>
                {custom && <DrillActions drill={drill} onEdit={onEdit} onDelete={onDelete} />}
              </li>
            )
          })}
        </ul>
      )}
      {pages > 1 && (
        <nav className="pagination" aria-label="Library pages">
          <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
            Previous
          </button>
          <span className="pagination-pages">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className="pagination-page"
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
                onClick={() => goToPage(n)}
              >
                {n}
              </button>
            ))}
          </span>
          <button type="button" disabled={page === pages} onClick={() => goToPage(page + 1)}>
            Next
          </button>
        </nav>
      )}
    </section>
  )
}
