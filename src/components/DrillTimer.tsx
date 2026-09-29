import { Timer } from 'lucide-react'
import { formatTime } from '../timer/stopwatch'

interface Props {
  elapsed: number
  running: boolean
  /** The drill is over, so this is the final time. */
  done: boolean
}

/** The player's thinking time for the current run, in a bar along the bottom of the screen. */
export function DrillTimer({ elapsed, running, done }: Props) {
  const state = done ? 'Final time' : running ? 'Your time' : 'Paused'
  return (
    <div className={`drill-timer${running ? ' running' : ''}${done ? ' done' : ''}`} data-testid="drill-timer">
      <Timer aria-hidden size={16} />
      <span className="drill-timer-label">{state}</span>
      <span className="drill-timer-time" data-testid="drill-time">
        {formatTime(elapsed)}
      </span>
    </div>
  )
}
