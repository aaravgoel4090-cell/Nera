import type { StatEffects } from './stats'

export type TaskCategory =
  | 'school'
  | 'coaching'
  | 'study'
  | 'sleep'
  | 'free'
  | 'misc'

export interface TaskDeadline {
  /** 0 = Monday, 6 = Sunday. */
  day: number
  /** Minutes from midnight. */
  minutes: number
}

export interface Task {
  id: string
  definitionId: string
  title: string
  emoji: string
  category: TaskCategory
  durationMinutes: number
  effects: StatEffects
  /** Minimum stat values needed before Nera can start this task. */
  requires?: StatEffects
  deadline: TaskDeadline
  dueLabel: string
  hint: string
  /** Sleep and free time stretch to fill the gap they are dropped into. */
  flexible: boolean
}

export type PlacedStatus = 'planned' | 'active' | 'done' | 'skipped' | 'failed'

export interface PlacedTask extends Task {
  day: number
  startMinutes: number
  /** Flexible tasks may exceed 1440 minutes and spill into the next day. */
  effectiveDurationMinutes: number
  status: PlacedStatus
}

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  school: 'School',
  coaching: 'Coaching',
  study: 'Study',
  sleep: 'Sleep',
  free: 'Free time',
  misc: 'Other',
}

export const TASK_CATEGORY_COLOR: Record<TaskCategory, string> = {
  school: '#6fa987',
  coaching: '#d08a63',
  study: '#6d93d6',
  sleep: '#8a7ab8',
  free: '#5fb6a8',
  misc: '#c3a86f',
}
