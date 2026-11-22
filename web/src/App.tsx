import { useCallback, useState } from 'react'
import { Cutscene } from './components/Cutscene/Cutscene'
import { EndingScreen } from './components/EndingScreen/EndingScreen'
import { Notifications } from './components/Notifications/Notifications'
import { StatsPanel } from './components/StatsPanel/StatsPanel'
import { Timetable, type TimetablePreview } from './components/Timetable/Timetable'
import { TodoPanel } from './components/TodoPanel/TodoPanel'
import { attendanceRatio } from './simulation/attendance'
import type { PlacedTask, Task } from './types/task'
import { useGame } from './hooks/useGame'
import './styles/global.css'

const SEED = 20261122

function App() {
  const { state, engine, refresh } = useGame(SEED)
  const [dragging, setDragging] = useState<Task | PlacedTask | null>(null)
  const [preview, setPreview] = useState<TimetablePreview | null>(null)

  const clearDrag = useCallback(() => {
    setDragging(null)
    setPreview(null)
  }, [])

  const handleDrop = (day: number, startMinutes: number) => {
    if (!dragging) return
    if ('effectiveDurationMinutes' in dragging) {
      engine.movePlaced(dragging.id, day, startMinutes)
    } else {
      engine.placeTask(dragging.id, day, startMinutes)
    }
    refresh()
    clearDrag()
  }

  const handleReturn = (id: string) => {
    engine.returnToTodo(id)
    refresh()
  }

  return (
    <div className="app-shell">
      <header className="app-bar">
        <div className="app-bar__brand">
          <h1 className="app-bar__title">NERA</h1>
          <p className="app-bar__subtitle">A timetable you can never quite win</p>
        </div>
        <div className="app-bar__flags">
          {state.fastForward && <span className="app-bar__flag app-bar__flag--fast">20× time</span>}
          <span className="app-bar__flag">Week {state.week} · {Math.round(attendanceRatio(state.attendance) * 100)}% attendance</span>
        </div>
      </header>

      <main className="app-grid">
        <TodoPanel
          tasks={state.todo}
          draggingId={dragging?.id}
          canReturn={Boolean(dragging && 'effectiveDurationMinutes' in dragging)}
          onDragBegin={setDragging}
          onDragEnd={clearDrag}
          onDropOnTodo={() => {
            if (dragging && 'effectiveDurationMinutes' in dragging) handleReturn(dragging.id)
            clearDrag()
          }}
        />

        <Timetable
          placed={state.placed}
          holidays={state.holidays}
          week={state.week}
          dayIndex={state.dayIndex}
          currentMinutes={state.currentMinutes}
          dragging={dragging}
          preview={preview}
          onPreview={setPreview}
          onDrop={handleDrop}
          onDragEnd={clearDrag}
          onReturn={handleReturn}
        />

        <StatsPanel
          stats={state.stats}
          attendance={state.attendance}
          difficulty={state.difficulty}
          week={state.week}
          fastForward={state.fastForward}
          schoolLost={state.schoolLost}
        />
      </main>

      <Notifications items={state.notifications} />

      {state.phase === 'intro' && (
        <Cutscene
          kind="intro"
          onComplete={() => {
            engine.begin()
            refresh()
          }}
        />
      )}

      {state.phase === 'ending' && (
        <Cutscene
          kind="ending"
          reason={state.endingReason}
          onComplete={() => {
            engine.finishEnding()
            refresh()
          }}
        />
      )}

      {state.phase === 'ended' && (
        <EndingScreen
          weeks={state.week}
          attendance={Math.round(attendanceRatio(state.attendance) * 100)}
          onRestart={() => {
            engine.restart()
            refresh()
            clearDrag()
          }}
        />
      )}
    </div>
  )
}

export default App
