import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { numberMoves, stepHistory, type HistoryKey } from '../drill/history'
import { IconButton } from './PanelParts'

const KEYS: HistoryKey[] = ['ArrowLeft', 'ArrowRight', 'Home', 'End']

interface Props {
  /** Position the moves were played from. */
  fen: string
  /** Every move played, in SAN. */
  moves: string[]
  /** How many of them the board shows. */
  shown: number
  onShow: (shown: number) => void
  /** Index of the first move played after the drill line, marked with a bar. */
  lineEnd?: number
  /** Show the back and forward buttons here; off when they sit under the board instead. */
  nav?: boolean
}

/** The moves played so far, each clickable, with back and forward buttons. The arrow keys step through them too. */
export function MoveHistory({ fen, moves, shown, onShow, lineEnd, nav = true }: Props) {
  const total = moves.length
  const list = useRef<HTMLParagraphElement>(null)

  // On phones the list is one line that scrolls sideways: keep the shown move in view, without moving the page.
  useEffect(() => {
    const el = list.current
    const current = el?.querySelector<HTMLElement>('[aria-current]')
    if (!el || el.scrollWidth <= el.clientWidth) return
    el.scrollLeft = current ? current.offsetLeft - el.offsetLeft - el.clientWidth / 2 : 0
  }, [shown, total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!KEYS.includes(e.key as HistoryKey) || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      const next = stepHistory(shown, total, e.key as HistoryKey)
      if (next !== shown) onShow(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown, total, onShow])

  return (
    <>
      <p ref={list} className={total === 0 ? 'moves moves-empty' : 'moves'} data-testid="moves">
        {total === 0
          ? 'No moves played yet.'
          : numberMoves(fen, moves).map(({ san, number }, i) => (
              <span key={i}>
                {i > 0 && ' '}
                {i === lineEnd && i > 0 && '| '}
                {number && `${number} `}
                <button
                  type="button"
                  className="move"
                  aria-current={i === shown - 1 ? 'step' : undefined}
                  onClick={() => onShow(i + 1)}
                >
                  {san}
                </button>
              </span>
            ))}
      </p>
      {nav && (
        <div className="history-nav">
          <HistoryButtons shown={shown} total={total} onShow={onShow} />
        </div>
      )}
    </>
  )
}

/** Back and forward one move. */
export function HistoryButtons({ shown, total, onShow, size = 18 }: { shown: number; total: number; onShow: (shown: number) => void; size?: number }) {
  return (
    <>
      <IconButton label="Previous move (←)" onClick={() => onShow(shown - 1)} disabled={shown === 0}>
        <ChevronLeft aria-hidden size={size} />
      </IconButton>
      <IconButton label="Next move (→)" onClick={() => onShow(shown + 1)} disabled={shown === total}>
        <ChevronRight aria-hidden size={size} />
      </IconButton>
    </>
  )
}
