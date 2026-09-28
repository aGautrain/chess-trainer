import { summarize, type DrillProgress } from '../drill/progress'

/** Best result against Stockfish's move target on a drill card: "20/14 moves", or a Completed tag once it is matched. */
export function ProgressTag({ progress }: { progress: DrillProgress | null }) {
  const summary = summarize(progress)
  if (!summary) return null
  if (summary.kind === 'completed') {
    return (
      <span className="progress-tag completed" title={`Solved in ${summary.best} moves, Stockfish's shortest is ${summary.target}`}>
        Completed
      </span>
    )
  }
  return <span className="progress-tag">{summary.text}</span>
}
