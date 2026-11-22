import type { Stat } from './stats'
import type { PlacedTask, Task } from './task'

export type GamePhase = 'intro' | 'playing' | 'ending' | 'ended'

export interface GameNotification {
  id: string
  time: string
  text: string
  tone: 'info' | 'good' | 'warn' | 'danger'
}

export interface DayHolidays {
  school: boolean
  coaching: boolean
  schoolReason?: string
  coachingReason?: string
}

export interface Attendance {
  attended: number
  total: number
}

export interface GameState {
  seed: number
  week: number
  dayIndex: number
  currentMinutes: number
  todo: Task[]
  placed: PlacedTask[]
  stats: Stat[]
  notifications: GameNotification[]
  attendance: Attendance
  holidays: DayHolidays[]
  difficulty: number
  coachingSkipped: boolean
  schoolLost: boolean
  phase: GamePhase
  endingReason: string
  /** Time accelerates when Nera has packed the timetable. */
  fastForward: boolean
  /** Incremented on every engine update so React can cheaply detect changes. */
  revision: number
}
