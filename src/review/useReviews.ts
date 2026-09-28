import { useEffect, useState, useSyncExternalStore } from 'react'
import { ReviewSchedule } from './scheduler'

/** The app's review schedule, backed by localStorage. */
export const reviews = new ReviewSchedule()

/** Re-renders the caller whenever a review is recorded. */
export function useReviews(): ReviewSchedule {
  useSyncExternalStore(reviews.subscribe, reviews.getVersion)
  return reviews
}

/** The current time, refreshed every `intervalMs` so due dates tick over without a reload. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
