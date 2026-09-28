import { useEffect, useState } from 'react'
import { loadProgress, saveProgress, withoutDrill, withResult, withTarget, type ProgressMap } from './drill/progress'
import type { Drill } from './drill/types'

/** Best results and the move targets of fixed drills, kept in localStorage. */
export function useDrillProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  return {
    progress,
    recordResult: (drill: Drill, moves: number, target: number | null) => setProgress((p) => withResult(p, drill, moves, target)),
    recordTarget: (drill: Drill, target: number | null) => setProgress((p) => withTarget(p, drill, target)),
    forget: (id: string) => setProgress((p) => withoutDrill(p, id)),
  }
}
