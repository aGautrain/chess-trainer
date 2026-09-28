import { useEffect, useState } from 'react'
import { drillSignature, hasTarget, loadProgress, progressFor, saveProgress, withoutDrill, withResult, withTarget, type ProgressMap } from './drill/progress'
import { computeTarget } from './drill/targets'
import type { Drill, EngineDrill } from './drill/types'
import { getAnalysisEngine } from './engine/stockfish'

/**
 * Best results and Stockfish move targets for the drills, kept in localStorage.
 * Targets missing for drills that can have one are searched in the background, one drill at a time.
 */
export function useDrillProgress(drills: Drill[]) {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const missing = drills.filter((d): d is EngineDrill => hasTarget(d) && progressFor(progress, d)?.target === undefined)
  const missingKey = missing.map((d) => `${d.id}:${drillSignature(d)}`).join(',')

  useEffect(() => {
    if (missing.length === 0) return
    let cancelled = false
    const engine = getAnalysisEngine()
    for (const drill of missing) {
      computeTarget(drill, (fen, limits) => engine.search(fen, limits))
        .then((target) => !cancelled && setProgress((p) => withTarget(p, drill, target)))
        // Without Stockfish there is no target to show; the drill still plays as before.
        .catch(() => undefined)
    }
    return () => {
      cancelled = true
    }
    // `missing` is rebuilt every render; its ids and contents say when it really changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey])

  return {
    progress,
    recordResult: (drill: Drill, moves: number) => setProgress((p) => withResult(p, drill, moves)),
    forget: (id: string) => setProgress((p) => withoutDrill(p, id)),
  }
}
