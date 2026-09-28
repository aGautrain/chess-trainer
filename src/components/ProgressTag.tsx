import { summarize, type DrillProgress } from '../drill/progress'

/** Best result on a Library card: a Completed tag once a run matched Stockfish's shortest mate, else the best so far. */
export function ProgressTag({ progress }: { progress: DrillProgress | null }) {
  const summary = summarize(progress)
  if (!summary) return null
  return <span className={summary.completed ? 'progress-tag completed' : 'progress-tag'}>{summary.text}</span>
}
