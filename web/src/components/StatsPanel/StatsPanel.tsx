import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { attendanceRatio } from '../../simulation/attendance'
import { statColor, statStatus } from '../../simulation/stats'
import type { Attendance } from '../../types/gameState'
import type { Stat } from '../../types/stats'
import './StatsPanel.css'

interface StatsPanelProps {
  stats: Stat[]
  attendance: Attendance
  difficulty: number
  week: number
  fastForward: boolean
  schoolLost: boolean
}

export function StatsPanel({
  stats,
  attendance,
  difficulty,
  week,
  fastForward,
  schoolLost,
}: StatsPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const attendancePercent = Math.round(attendanceRatio(attendance) * 100)

  return (
    <section className="panel stats-panel" aria-labelledby="stats-heading">
      <header className="panel__header">
        <div>
          <p className="panel__eyebrow">Condition</p>
          <h2 id="stats-heading">NERA</h2>
        </div>
        <span className="stats-panel__badge">Class 11 PCM</span>
      </header>

      <div className="stats-panel__portrait" aria-hidden="true">
        <span className="stats-panel__portrait-face">{schoolLost ? '◕︵◕' : '◕‿◕'}</span>
        <span className="stats-panel__portrait-label">Week {week} · {fastForward ? 'time rushing' : 'one day at a time'}</span>
      </div>

      <div className="stats-panel__list">
        {stats.map((stat) => {
          const color = statColor(stat)
          const status = statStatus(stat)
          const percent = Math.max(0, Math.min(100, (stat.value / stat.max) * 100))
          const isActive = activeId === stat.id

          return (
            <div
              className={`stat-row stat-row--${status}`}
              key={stat.id}
              style={{ '--stat-color': color } as CSSProperties}
              onMouseEnter={() => setActiveId(stat.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(stat.id)}
              onBlur={() => setActiveId(null)}
              tabIndex={0}
            >
              <div className="stat-row__top">
                <span className="stat-row__name">{stat.name}</span>
                <span className="stat-row__value">
                  {Math.round(stat.value)}<span>/{stat.max}</span>
                </span>
              </div>
              <div className="stat-row__track">
                <motion.div
                  className="stat-row__fill"
                  initial={false}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="stat-row__tooltip"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.14 }}
                  >
                    {stat.description}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <div className="stats-panel__secondary">
        <div className="stats-panel__secondary-row">
          <span>Attendance</span>
          <strong className={attendancePercent < 75 ? 'is-danger' : ''}>{attendancePercent}%</strong>
        </div>
        <div className="stats-panel__bar">
          <span style={{ width: `${attendancePercent}%` }} />
        </div>
        <div className="stats-panel__secondary-row">
          <span>Difficulty</span>
          <strong>×{difficulty.toFixed(2)}</strong>
        </div>
        <p className="stats-panel__footnote">
          School needs 75% attendance. Skipping coaching makes every task harder.
        </p>
      </div>
    </section>
  )
}
