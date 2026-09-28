import type { Drill, Theme } from './types'

/** A tag the library can filter by. Most are derived from the drill's data; themes come from built-in drills. */
export type Tag =
  | 'line'
  | 'engine'
  | 'checkmate'
  | 'draw'
  | 'win-material'
  | 'randomized'
  | 'white'
  | 'black'
  | 'built-in'
  | 'mine'
  | Theme

/** Every tag with its chip label, in the order the chips are shown. */
export const TAGS: { tag: Tag; label: string }[] = [
  { tag: 'line', label: 'Line' },
  { tag: 'engine', label: 'Engine' },
  { tag: 'checkmate', label: 'Checkmate' },
  { tag: 'draw', label: 'Draw' },
  { tag: 'win-material', label: 'Win material' },
  { tag: 'randomized', label: 'Randomized' },
  { tag: 'opening', label: 'Opening' },
  { tag: 'endgame', label: 'Endgame' },
  { tag: 'basic-mate', label: 'Basic mate' },
  { tag: 'pawn-ending', label: 'Pawn ending' },
  { tag: 'rook-ending', label: 'Rook ending' },
  { tag: 'queen-ending', label: 'Queen ending' },
  { tag: 'minor-pieces', label: 'Minor pieces' },
  { tag: 'white', label: 'As white' },
  { tag: 'black', label: 'As black' },
  { tag: 'built-in', label: 'Built-in' },
  { tag: 'mine', label: 'Made by you' },
]

const LABELS = new Map(TAGS.map(({ tag, label }) => [tag, label]))

export const tagLabel = (tag: Tag): string => LABELS.get(tag) ?? tag

export const isTag = (value: string): value is Tag => LABELS.has(value as Tag)

/** The drill's tags: mode, goal, randomized, side, source, then its themes. */
export function drillTags(drill: Drill, custom: boolean): Tag[] {
  const tags: Tag[] = [drill.mode]
  if (drill.mode === 'engine') {
    tags.push(drill.goal.kind === 'win-piece' ? 'win-material' : drill.goal.kind)
    if (drill.randomize) tags.push('randomized')
  }
  tags.push(drill.playerColor, custom ? 'mine' : 'built-in')
  for (const theme of drill.themes ?? []) if (!tags.includes(theme)) tags.push(theme)
  return tags
}

/** Lower-case words of a search box, ignoring extra spaces. */
function words(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * The drills that carry every selected tag and contain every word of the query
 * in their name, description or tag labels.
 */
export function filterDrills(drills: Drill[], isCustom: (drill: Drill) => boolean, selected: Tag[], query: string): Drill[] {
  const terms = words(query)
  return drills.filter((drill) => {
    const tags = drillTags(drill, isCustom(drill))
    if (!selected.every((tag) => tags.includes(tag))) return false
    if (terms.length === 0) return true
    const text = [drill.name, drill.description, ...tags.map(tagLabel)].join(' ').toLowerCase()
    return terms.every((term) => text.includes(term))
  })
}

/** Tags that at least one of the drills carries, in chip order. */
export function availableTags(drills: Drill[], isCustom: (drill: Drill) => boolean): Tag[] {
  const present = new Set(drills.flatMap((d) => drillTags(d, isCustom(d))))
  return TAGS.map(({ tag }) => tag).filter((tag) => present.has(tag))
}

export const PAGE_SIZE = 12

/** The items on a 1-based page, with the page clamped to the ones that exist. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return { items: items.slice((current - 1) * size, current * size), page: current, pages }
}
