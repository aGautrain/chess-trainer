import { useState } from 'react'
import { DrillEditor } from './components/DrillEditor'
import { DrillTrainer } from './components/DrillTrainer'
import { EngineDrillTrainer } from './components/EngineDrillTrainer'
import { LibraryPage } from './components/LibraryPage'
import { MyDrills } from './components/MyDrills'
import { drills as builtInDrills } from './drill/drills'
import { loadFavorites, saveFavorites, toggleFavorite } from './drill/favorites'
import { loadCustomDrills, newDrillId, saveCustomDrills } from './drill/storage'
import type { Drill } from './drill/types'
import { progressFor } from './drill/progress'
import { useDrillProgress } from './useDrillProgress'
import { useHashPage } from './useHashPage'

type View = { kind: 'play' } | { kind: 'edit'; drill?: Drill; id: string }

export default function App() {
  const [customDrills, setCustomDrills] = useState<Drill[]>(() => loadCustomDrills())
  // On first run everything already there starts out starred, so My drills isn't empty.
  const [favorites, setFavorites] = useState<string[]>(
    () => loadFavorites() ?? [...builtInDrills, ...customDrills].map((d) => d.id),
  )
  // Open on the first drill of My drills, falling back to the first built-in one.
  const [selectedId, setSelectedId] = useState<string>(
    () =>
      favorites.find((id) => [...builtInDrills, ...customDrills].some((d) => d.id === id)) ??
      builtInDrills[0].id,
  )
  const [view, setView] = useState<View>({ kind: 'play' })
  const [saveFailed, setSaveFailed] = useState(false)
  const [page, goTo] = useHashPage()

  const allDrills = [...builtInDrills, ...customDrills]
  const selected = allDrills.find((d) => d.id === selectedId) ?? builtInDrills[0]
  const byId = new Map(allDrills.map((d) => [d.id, d]))
  const myDrills = favorites.flatMap((id) => byId.get(id) ?? [])
  const isCustom = (drill: Drill) => customDrills.some((d) => d.id === drill.id)
  const isStarred = (drill: Drill) => favorites.includes(drill.id)
  const { progress, recordResult, recordTarget, forget } = useDrillProgress()
  const progressOf = (drill: Drill) => progressFor(progress, drill)

  function updateCustom(next: Drill[]) {
    setCustomDrills(next)
    setSaveFailed(!saveCustomDrills(next))
  }

  function updateFavorites(next: string[]) {
    setFavorites(next)
    setSaveFailed(!saveFavorites(next))
  }

  function play(drill: Drill) {
    setSelectedId(drill.id)
    setView({ kind: 'play' })
    goTo('train')
  }

  function edit(drill?: Drill) {
    setView({ kind: 'edit', drill, id: drill?.id ?? newDrillId() })
    goTo('train')
  }

  function save(drill: Drill) {
    const exists = customDrills.some((d) => d.id === drill.id)
    updateCustom(exists ? customDrills.map((d) => (d.id === drill.id ? drill : d)) : [...customDrills, drill])
    // A drill you just made belongs in My drills.
    if (!exists && !favorites.includes(drill.id)) updateFavorites([...favorites, drill.id])
    setSelectedId(drill.id)
    setView({ kind: 'play' })
  }

  function remove(drill: Drill) {
    updateCustom(customDrills.filter((d) => d.id !== drill.id))
    if (favorites.includes(drill.id)) updateFavorites(favorites.filter((id) => id !== drill.id))
    forget(drill.id)
    if (selectedId === drill.id) setSelectedId((myDrills.find((d) => d.id !== drill.id) ?? builtInDrills[0]).id)
    if (view.kind === 'edit' && view.id === drill.id) setView({ kind: 'play' })
  }

  const toggleStar = (drill: Drill) => updateFavorites(toggleFavorite(favorites, drill.id))

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#/">
            Chess Trainer
          </a>
          <nav className="tabs" aria-label="Pages">
            <a href="#/" aria-current={page === 'train' ? 'page' : undefined}>
              Train
            </a>
            <a href="#/library" aria-current={page === 'library' ? 'page' : undefined}>
              Library
            </a>
          </nav>
        </div>
      </header>
      <main>
        {saveFailed && (
          <p className="warning" role="alert">
            Your browser did not let this page save, so your drills and stars will be lost when you close the tab.
          </p>
        )}
        {page === 'library' ? (
          <LibraryPage
            drills={allDrills}
            isStarred={isStarred}
            isCustom={isCustom}
            progressOf={progressOf}
            onPlay={play}
            onToggleStar={toggleStar}
            onNew={() => edit()}
            onEdit={edit}
            onDelete={remove}
          />
        ) : (
          <>
            <p className="intro">Play the expected line from a setup, or play a position out against Stockfish. Everything runs in your browser.</p>
            <div className="layout">
              <MyDrills
                drills={myDrills}
                selectedId={view.kind === 'play' ? selected.id : null}
                onSelect={play}
                onNew={() => edit()}
                onBrowse={() => goTo('library')}
              />
              <div className="stage">
                {view.kind === 'edit' ? (
                  <DrillEditor key={view.id} drill={view.drill} id={view.id} onSave={save} onCancel={() => setView({ kind: 'play' })} />
                ) : (
                  // Keyed by content so switching or editing a drill starts it fresh.
                  selected.mode === 'engine' ? (
                    <EngineDrillTrainer key={`${selected.id}:${selected.fen}:${selected.playerColor}:${JSON.stringify(selected.goal)}:${selected.randomize === true}`} 
                      drill={selected}
                      progress={progressOf(selected)}
                      onSolved={(moves, target) => recordResult(selected, moves, target)}
                      onTarget={(target) => recordTarget(selected, target)}
                    />
                  ) : (
                    <DrillTrainer key={`${selected.id}:${selected.fen}:${selected.line.join(' ')}`} drill={selected} />
                  )
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
