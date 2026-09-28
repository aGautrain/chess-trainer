// Spaced repetition for drills, a small SM-2 variant stored in localStorage.

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewCard {
  /** Drill id. */
  id: string
  /** Growth factor for the interval, SM-2's "ease". */
  ease: number
  /** Current interval in days; 0 until the first successful review. */
  intervalDays: number
  /** Successful reviews in a row. */
  streak: number
  /** Times the drill was failed after being learned. */
  lapses: number
  /** When the drill is next due, epoch milliseconds. */
  due: number
  /** Last review, epoch milliseconds. */
  lastReviewed: number | null
}

export const DAY_MS = 24 * 60 * 60 * 1000
const MIN_EASE = 1.3
const DEFAULT_EASE = 2.5
/** A failed drill comes back after this long rather than tomorrow, so it can be retried in the same session. */
const RELEARN_MS = 10 * 60 * 1000

export function newCard(id: string, now: number = Date.now()): ReviewCard {
  return { id, ease: DEFAULT_EASE, intervalDays: 0, streak: 0, lapses: 0, due: now, lastReviewed: null }
}

/** Returns the card rescheduled after a review with the given grade. Does not mutate the input. */
export function review(card: ReviewCard, grade: Grade, now: number = Date.now()): ReviewCard {
  if (grade === 'again') {
    return {
      ...card,
      ease: Math.max(MIN_EASE, card.ease - 0.2),
      intervalDays: 0,
      streak: 0,
      lapses: card.intervalDays > 0 ? card.lapses + 1 : card.lapses,
      due: now + RELEARN_MS,
      lastReviewed: now,
    }
  }

  const ease = Math.max(MIN_EASE, card.ease + { hard: -0.15, good: 0, easy: 0.15 }[grade])
  let intervalDays: number
  if (card.streak === 0) intervalDays = grade === 'easy' ? 3 : 1
  else if (card.streak === 1) intervalDays = grade === 'hard' ? 3 : grade === 'good' ? 6 : 8
  else {
    const factor = grade === 'hard' ? 1.2 : grade === 'good' ? ease : ease * 1.3
    intervalDays = Math.max(card.intervalDays + 1, Math.round(card.intervalDays * factor))
  }

  return {
    ...card,
    ease,
    intervalDays,
    streak: card.streak + 1,
    due: startOfDay(now) + intervalDays * DAY_MS,
    lastReviewed: now,
  }
}

/** Local midnight, so a drill due "in 1 day" is due all of tomorrow rather than at this exact time tomorrow. */
function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Turns a finished drill run into a grade: any mistake means again, engine-accepted deviations mean hard. */
export function gradeFromRun(run: { mistakes: number; hintsUsed?: number; offBookMoves?: number }): Grade {
  if (run.mistakes > 0) return 'again'
  if ((run.hintsUsed ?? 0) > 0 || (run.offBookMoves ?? 0) > 0) return 'hard'
  return 'good'
}

export const STORAGE_KEY = 'chess-trainer:reviews:v1'

/** Minimal storage surface, so tests and non-browser code can pass their own. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** All review cards keyed by drill id, persisted in localStorage. */
export class ReviewSchedule {
  private cards: Record<string, ReviewCard>
  private readonly store: KeyValueStore | null
  private listeners = new Set<() => void>()
  private version = 0

  constructor(store: KeyValueStore | null = defaultStore()) {
    this.store = store
    this.cards = this.load()
  }

  /** Calls `listener` after every change; returns an unsubscribe function. Shaped for React's useSyncExternalStore. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Changes on every write, so React can tell when to re-render. */
  getVersion = (): number => this.version

  private load(): Record<string, ReviewCard> {
    try {
      const raw = this.store?.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      return parsed && typeof parsed === 'object' && parsed.cards ? parsed.cards : {}
    } catch {
      return {}
    }
  }

  private save(): void {
    this.version++
    for (const listener of [...this.listeners]) listener()
    try {
      this.store?.setItem(STORAGE_KEY, JSON.stringify({ version: 1, cards: this.cards }))
    } catch {
      // Storage full or blocked (private mode): the schedule still works for this session.
    }
  }

  get(id: string): ReviewCard | undefined {
    return this.cards[id]
  }

  all(): ReviewCard[] {
    return Object.values(this.cards)
  }

  /** Records a review for `id`, creating its card on first use, and persists the schedule. */
  record(id: string, grade: Grade, now: number = Date.now()): ReviewCard {
    const card = review(this.cards[id] ?? newCard(id, now), grade, now)
    this.cards[id] = card
    this.save()
    return card
  }

  /** Drills due at `now`, most overdue first. Drills never reviewed are not included; see `unseen`. */
  due(now: number = Date.now()): ReviewCard[] {
    return this.all()
      .filter((card) => card.due <= now)
      .sort((a, b) => a.due - b.due)
  }

  /** Ids from `drillIds` that have never been reviewed. */
  unseen(drillIds: string[]): string[] {
    return drillIds.filter((id) => !this.cards[id])
  }

  /** Forgets a drill, e.g. when it is deleted. */
  remove(id: string): void {
    delete this.cards[id]
    this.save()
  }
}
