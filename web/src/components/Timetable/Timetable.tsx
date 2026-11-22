import { useEffect, useRef, type CSSProperties, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  formatClock,
  MINUTES_PER_DAY,
  minutesToPercent,
  WEEKDAYS,
} from '../../simulation/clock'
import { validatePlacement } from '../../simulation/placement'
import { TASK_CATEGORY_COLOR, type PlacedTask, type Task } from '../../types/task'
import type { DayHolidays } from '../../types/gameState'
import { TaskCard } from '../TaskCard/TaskCard'
import './Timetable.css'

export interface TimetablePreview {
  day: number
  startMinutes: number
  effectiveDurationMinutes: number
  valid: boolean
  reason: string
}

interface TimetableProps {
  placed: PlacedTask[]
  holidays: DayHolidays[]
  week: number
  dayIndex: number
  currentMinutes: number
  dragging: Task | PlacedTask | null
  preview: TimetablePreview | null
  onPreview: (preview: TimetablePreview | null) => void
  onDrop: (day: number, startMinutes: number) => void
  onDragEnd: () => void
  onReturn: (id: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, index) => index)
const ROW_HEIGHT = 48

function spanStyle(startMinutes: number, durationMinutes: number): CSSProperties {
  return {
    left: `${minutesToPercent(startMinutes)}%`,
    width: `${minutesToPercent(durationMinutes)}%`,
  }
}

export function Timetable({
  placed,
  holidays,
  week,
  dayIndex,
  currentMinutes,
  dragging,
  preview,
  onPreview,
  onDrop,
  onDragEnd,
  onReturn,
}: TimetableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = scrollRef.current
    const track = trackRef.current
    if (!container || !track) return
    const maxScroll = Math.max(0, track.clientWidth - container.clientWidth)
    const target = Math.min(maxScroll, Math.max(0,
      (currentMinutes / MINUTES_PER_DAY) * track.clientWidth - container.clientWidth * 0.35,
    ))
    container.scrollLeft = target
    container.scrollTop = dayIndex * ROW_HEIGHT
  }, [currentMinutes, dayIndex])

  const startFromEvent = (event: DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    return Math.round((ratio * MINUTES_PER_DAY) / 15) * 15
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, day: number) => {
    if (!dragging) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const startMinutes = startFromEvent(event)
    const ignoreId = 'effectiveDurationMinutes' in dragging ? dragging.id : undefined
    const result = validatePlacement(
      dragging,
      placed,
      holidays,
      day,
      startMinutes,
      ignoreId,
    )
    onPreview({
      day,
      startMinutes: result.startMinutes,
      effectiveDurationMinutes: result.effectiveDurationMinutes,
      valid: result.ok,
      reason: result.reason,
    })
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, day: number) => {
    if (!dragging) return
    event.preventDefault()
    onDrop(day, startFromEvent(event))
    onDragEnd()
  }

  const lateZone = dragging && dragging.deadline.day <= 6 ? dragging.deadline : null

  return (
    <section className="panel timetable-panel" aria-labelledby="timetable-heading">
      <header className="panel__header timetable-panel__header">
        <div>
          <p className="panel__eyebrow">Week {week} · {WEEKDAYS[dayIndex]}</p>
          <h2 id="timetable-heading">TIMETABLE</h2>
        </div>
        <div className="timetable-panel__clock">
          <span className="timetable-panel__clock-label">Now</span>
          <strong>{formatClock(currentMinutes)}</strong>
        </div>
      </header>

      <div className="timetable" ref={scrollRef} onDragLeave={() => onPreview(null)}>
        <div className="timetable__inner">
          <div className="timetable__hours">
            <span className="timetable__corner" />
            <div className="timetable__hour-grid">
              {HOURS.map((hour) => (
                <span key={hour} className="timetable__hour">{String(hour).padStart(2, '0')}</span>
              ))}
            </div>
          </div>

          <div className="timetable__body">
            {WEEKDAYS.map((dayName, day) => {
              const isToday = day === dayIndex
              const holiday = holidays[day] ?? { school: false, coaching: false }
              const dayPlaced = placed.filter((task) => task.day === day)
              const spill = placed.filter((task) =>
                task.day === day - 1 && task.startMinutes + task.effectiveDurationMinutes > MINUTES_PER_DAY,
              )
              const showPreview = preview !== null && preview.day === day && dragging !== null

              return (
                <div
                  className={`timetable__row${isToday ? ' timetable__row--today' : ''}`}
                  key={dayName}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="timetable__day">
                    {dayName}
                    {(holiday.school || holiday.coaching) && <em className="timetable__holiday-dot" />}
                  </span>

                  <div
                    className={`timetable__track${day === 0 ? ' timetable__track--measure' : ''}`}
                    ref={day === 0 ? trackRef : undefined}
                    onDragOver={(event) => handleDragOver(event, day)}
                    onDrop={(event) => handleDrop(event, day)}
                  >
                    {holiday.school && (
                      <div className="timetable__holiday" style={spanStyle(8 * 60, 360)}>SCHOOL CLOSED</div>
                    )}
                    {holiday.coaching && (
                      <div className="timetable__holiday" style={spanStyle(16 * 60, 180)}>COACHING CLOSED</div>
                    )}

                    {lateZone && lateZone.day === day && (
                      <div className="timetable__late-zone" style={spanStyle(lateZone.minutes, MINUTES_PER_DAY - lateZone.minutes)} />
                    )}

                    {spill.map((task) => {
                      const overflow = task.startMinutes + task.effectiveDurationMinutes - MINUTES_PER_DAY
                      return (
                        <div
                          className="timetable__block timetable__block--spill"
                          key={`${task.id}-spill`}
                          style={{
                            ...spanStyle(0, overflow),
                            '--task-color': TASK_CATEGORY_COLOR[task.category],
                          } as CSSProperties}
                        >
                          <TaskCard task={task} variant="block" compact onReturn={onReturn} />
                        </div>
                      )
                    })}

                    {dayPlaced.map((task) => {
                      const visibleDuration = Math.min(
                        task.effectiveDurationMinutes,
                        MINUTES_PER_DAY - task.startMinutes,
                      )
                      return (
                        <div
                          className="timetable__block"
                          key={task.id}
                          style={{
                            ...spanStyle(task.startMinutes, visibleDuration),
                            '--task-color': TASK_CATEGORY_COLOR[task.category],
                          } as CSSProperties}
                        >
                          <TaskCard task={task} variant="block" onReturn={onReturn} />
                        </div>
                      )
                    })}

                    <AnimatePresence>
                      {showPreview && dragging && preview && (
                        <motion.div
                          key="preview"
                          className={`timetable__preview${preview.valid ? '' : ' timetable__preview--invalid'}`}
                          style={{
                            ...spanStyle(preview.startMinutes, Math.min(
                              preview.effectiveDurationMinutes,
                              MINUTES_PER_DAY - preview.startMinutes,
                            )),
                            '--task-color': TASK_CATEGORY_COLOR[dragging.category],
                          } as CSSProperties}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                        >
                          <span>{dragging.emoji} {preview.reason || dragging.title}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isToday && (
                      <div
                        className="timetable__now-line"
                        style={{ left: `${minutesToPercent(currentMinutes)}%` }}
                      >
                        <span className="timetable__now-dot" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p className="timetable__note">
        Minor lines = 15 min · major lines = 1 hour · packed days run at 20× speed
      </p>
    </section>
  )
}
