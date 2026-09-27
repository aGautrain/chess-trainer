import type { Drill } from '../drill/types'
import type { ReviewCard } from '../review/scheduler'
import { formatDue } from '../review/format'
import { useNow, useReviews } from '../review/useReviews'

function status(card: ReviewCard | undefined, now: number): { label: string; due: boolean } {
  if (!card) return { label: 'new', due: true }
  return { label: formatDue(card.due, now), due: card.due <= now }
}

/** Lists every drill with when it is next due for review, due drills first. */
export function ReviewPanel({ drills, onSelect }: { drills: Drill[]; onSelect?: (drill: Drill) => void }) {
  const schedule = useReviews()
  const now = useNow()
  const rows = drills
    .map((drill) => ({ drill, card: schedule.get(drill.id), ...status(schedule.get(drill.id), now) }))
    .sort((a, b) => (a.card?.due ?? 0) - (b.card?.due ?? 0))
  const dueCount = rows.filter((r) => r.due).length

  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Reviews</h2>
      <p className="description">
        {dueCount === 0 ? 'Nothing due. Come back later.' : `${dueCount} drill${dueCount === 1 ? '' : 's'} to review.`}
      </p>
      <ul data-testid="reviews">
        {rows.map(({ drill, card, label, due }) => (
          <li key={drill.id} className={due ? 'review-due' : undefined}>
            {onSelect ? (
              <button type="button" className="link" onClick={() => onSelect(drill)}>
                {drill.name}
              </button>
            ) : (
              <span>{drill.name}</span>
            )}
            <span className="review-when">
              {label}
              {card && card.streak > 0 ? `, streak ${card.streak}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
