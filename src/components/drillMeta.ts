import { goalLabel } from '../drill/goals'
import type { Drill } from '../drill/types'

/** One-line summary of a drill, such as "Line · 14 moves · as white". */
export function drillMeta(drill: Drill): string {
  const kind = drill.mode === 'engine' ? `Engine · ${goalLabel(drill.goal).toLowerCase()}` : `Line · ${drill.line.length} moves`
  return `${kind} · as ${drill.playerColor}`
}
