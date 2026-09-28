const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

/** "due now", "in 10 min", "tomorrow", "in 6 days". */
export function formatDue(due: number, now: number = Date.now()): string {
  const ms = due - now
  if (ms <= 0) return 'due now'
  if (ms < 60 * MINUTE_MS) return `in ${Math.max(1, Math.round(ms / MINUTE_MS))} min`
  const days = Math.ceil(ms / DAY_MS)
  return days <= 1 ? 'tomorrow' : `in ${days} days`
}
