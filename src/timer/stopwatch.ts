/** Time counted so far, and when the current stretch started (null while stopped). Times are in ms. */
export interface Stopwatch {
  elapsed: number
  since: number | null
}

export const stopped: Stopwatch = { elapsed: 0, since: null }

export function start(watch: Stopwatch, now: number): Stopwatch {
  return watch.since === null ? { ...watch, since: now } : watch
}

export function stop(watch: Stopwatch, now: number): Stopwatch {
  return watch.since === null ? watch : { elapsed: read(watch, now), since: null }
}

/** Back to zero; a running watch keeps running from `now`. */
export function reset(watch: Stopwatch, now: number): Stopwatch {
  return { elapsed: 0, since: watch.since === null ? null : now }
}

export function read(watch: Stopwatch, now: number): number {
  return watch.elapsed + (watch.since === null ? 0 : Math.max(0, now - watch.since))
}

/** "0:07.4", "12:30.0", "1:02:03.5": tenths are cut, not rounded, so the display never runs ahead. */
export function formatTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100)
  const s = Math.floor(tenths / 10)
  const h = Math.floor(s / 3600)
  const m = Math.floor(s / 60) % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const clock = h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
  return `${clock}.${tenths % 10}`
}
