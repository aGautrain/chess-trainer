// Pure helpers for reading Stockfish's UCI output. Kept free of Worker code so they can be unit tested.

/** Engine score from the side to move's point of view. */
export type Score = { kind: 'cp'; value: number } | { kind: 'mate'; value: number }

export interface InfoLine {
  depth: number
  multipv: number
  score: Score
  pv: string[]
}

/** Parses an `info ... score ...` line. Returns null for lines without a score (currmove, string, etc.). */
export function parseInfo(line: string): InfoLine | null {
  if (!line.startsWith('info ')) return null
  const tokens = line.split(/\s+/)
  let depth = 0
  let multipv = 1
  let score: Score | null = null
  let pv: string[] = []
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (t === 'depth') depth = Number(tokens[++i])
    else if (t === 'multipv') multipv = Number(tokens[++i])
    else if (t === 'score') {
      const kind = tokens[++i]
      const value = Number(tokens[++i])
      if (kind === 'cp' || kind === 'mate') score = { kind, value }
      // Skip "lowerbound"/"upperbound" markers: they are not exact scores.
      if (tokens[i + 1] === 'lowerbound' || tokens[i + 1] === 'upperbound') return null
    } else if (t === 'pv') {
      pv = tokens.slice(i + 1)
      break
    }
  }
  if (!score) return null
  return { depth, multipv, score, pv }
}

/** Parses `bestmove e2e4 ponder e7e5`. Returns null when the line is not a bestmove line or there is no legal move. */
export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith('bestmove')) return undefined
  const move = line.split(/\s+/)[1]
  return !move || move === '(none)' ? null : move
}

const MATE_CP = 100_000

/** Collapses a score to centipawns so mates compare above any material advantage; shorter mates rank higher. */
export function scoreToCp(score: Score): number {
  if (score.kind === 'cp') return score.value
  if (score.value === 0) return -MATE_CP // side to move is mated
  return Math.sign(score.value) * (MATE_CP - Math.abs(score.value) * 100)
}

/** Flips a score to the other side's point of view. */
export function negate(score: Score): Score {
  return { kind: score.kind, value: -score.value } as Score
}

/** Short human label: "+1.35", "-0.20", "#3", "#-2". */
export function formatScore(score: Score): string {
  if (score.kind === 'mate') return `#${score.value}`
  const pawns = score.value / 100
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`
}

/** What the engine says about itself during the UCI handshake. */
export interface EngineIdentity {
  /** From `id name`, e.g. "Stockfish 17.1 Lite". */
  name: string
  /** Each option's value, starting from the default the engine announced. */
  options: Record<string, string>
}

/** Reads `id name` and `option name ... default ...` lines from the handshake output. */
export function parseIdentity(lines: string[]): EngineIdentity {
  let name = 'Unknown engine'
  const options: Record<string, string> = {}
  for (const line of lines) {
    const id = /^id name (.+)$/.exec(line)
    if (id) name = id[1].trim()
    const option = /^option name (.+?) type \S+(?: default (\S*))?/.exec(line)
    if (option && option[2] !== undefined) options[option[1]] = option[2]
  }
  return { name, options }
}
