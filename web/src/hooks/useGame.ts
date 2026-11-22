import { useEffect, useState } from 'react'
import type { GameState } from '../types/gameState'
import { GameEngine } from '../simulation/engine'

export interface GameController {
  state: GameState
  engine: GameEngine
  refresh: () => void
}

/**
 * Drives the engine on a real-time interval rather than requestAnimationFrame.
 * rAF stops in background tabs; Nera's clock should not.
 */
export function useGame(seed: number): GameController {
  const [engine] = useState(() => new GameEngine(seed))
  const [state, setState] = useState<GameState>(() => ({ ...engine.getState() }))

  const refresh = () => setState({ ...engine.getState() })

  useEffect(() => {
    let last = performance.now()
    let lastUiUpdate = last
    let lastRevision = engine.getState().revision

    const timer = window.setInterval(() => {
      const now = performance.now()
      const delta = Math.min(0.25, (now - last) / 1000)
      last = now
      engine.tick(delta)

      const current = engine.getState()
      if (current.revision !== lastRevision && now - lastUiUpdate >= 80) {
        lastRevision = current.revision
        lastUiUpdate = now
        setState({ ...current })
      }
    }, 50)

    return () => window.clearInterval(timer)
  }, [engine])

  return { state, engine, refresh }
}
