import type { GameNotification, GameState } from '../types/gameState'
import type { PlacedTask, Task } from '../types/task'
import { SeededRng } from '../utils/rng'
import {
  absoluteMinutes,
  formatClock,
  MINUTES_PER_DAY,
  MINUTES_PER_WEEK,
} from './clock'
import { attendanceRatio, isAttendanceLost } from './attendance'
import { computeDifficulty } from './difficulty'
import { generateWeekHolidays, hasCoaching, hasSchool } from './holidays'
import { validatePlacement } from './placement'
import {
  applyEffects,
  createInitialStats,
  getStat,
  meetsRequirements,
  setStat,
} from './stats'
import {
  generateCareTasks,
  generateFixedTasks,
  generateOrdinaryTasks,
  toPlaced,
} from './taskGenerator'

const NORMAL_MINUTES_PER_SECOND = MINUTES_PER_WEEK / 280
const FAST_MINUTES_PER_SECOND = MINUTES_PER_WEEK / 14
const STEP_MINUTES = 15
const FAILURE_STRESS = 20
const LOW_SLEEP_STRESS = 25

function initialState(seed: number): GameState {
  return {
    seed,
    week: 1,
    dayIndex: 0,
    currentMinutes: 0,
    todo: [],
    placed: [],
    stats: createInitialStats(),
    notifications: [],
    attendance: { attended: 0, total: 0 },
    holidays: [],
    difficulty: 1,
    coachingSkipped: false,
    schoolLost: false,
    phase: 'intro',
    endingReason: '',
    fastForward: false,
    revision: 0,
  }
}

export class GameEngine {
  private state: GameState
  private rng: SeededRng
  private notificationId = 0
  private drainAccumulator = 0
  private schoolDoneToday = false
  private coachingDoneToday = false

  constructor(seed = Date.now()) {
    this.rng = new SeededRng(seed)
    this.state = initialState(seed)
    this.startWeek()
    this.startDay()
    this.notify('Monday. The week begins before you are ready.', 'info')
  }

  getState(): GameState {
    return this.state
  }

  begin(): void {
    if (this.state.phase === 'intro') {
      this.state.phase = 'playing'
      this.state.revision += 1
    }
  }

  restart(seed = Date.now()): void {
    this.rng = new SeededRng(seed)
    this.state = initialState(seed)
    this.notificationId = 0
    this.drainAccumulator = 0
    this.schoolDoneToday = false
    this.coachingDoneToday = false
    this.startWeek()
    this.startDay()
    this.state.phase = 'playing'
    this.notify('A fresh week. Same system, new chances.', 'info')
  }

  /** Advance real time. Returns the mutable state object (revision is bumped). */
  tick(deltaSeconds: number): void {
    if (this.state.phase !== 'playing') return

    const rate = this.state.fastForward ? FAST_MINUTES_PER_SECOND : NORMAL_MINUTES_PER_SECOND
    let remaining = deltaSeconds * rate

    while (remaining > 0 && this.state.phase === 'playing') {
      const step = Math.min(STEP_MINUTES, remaining)
      this.advance(step)
      remaining -= step
    }
  }

  placeTask(taskId: string, day: number, rawStart: number): string | null {
    if (this.state.phase !== 'playing') return 'The game is not running'
    const task = this.state.todo.find((item) => item.id === taskId)
    if (!task) return 'That task is no longer in your to-do list'

    const result = validatePlacement(task, this.state.placed, this.state.holidays, day, rawStart)
    if (!result.ok) return result.reason

    const placed = toPlaced(task, day, result.startMinutes, result.effectiveDurationMinutes)
    this.state.placed = [...this.state.placed, placed]
    this.state.todo = this.state.todo.filter((item) => item.id !== taskId)
    this.state.revision += 1

    const finishesAt = absoluteMinutes(day, result.startMinutes) + result.effectiveDurationMinutes
    const deadlineAt = absoluteMinutes(task.deadline.day, task.deadline.minutes)
    if (finishesAt > deadlineAt) {
      this.notify(`${task.title} is scheduled past its deadline.`, 'warn')
    }
    return null
  }

  movePlaced(id: string, day: number, rawStart: number): string | null {
    if (this.state.phase !== 'playing') return 'The game is not running'
    const task = this.state.placed.find((item) => item.id === id)
    if (!task) return 'That task is not on the timetable'

    const result = validatePlacement(task, this.state.placed, this.state.holidays, day, rawStart, id)
    if (!result.ok) return result.reason

    task.day = day
    task.startMinutes = result.startMinutes
    task.effectiveDurationMinutes = result.effectiveDurationMinutes
    task.status = 'planned'
    this.state.revision += 1
    return null
  }

  returnToTodo(id: string): void {
    const task = this.state.placed.find((item) => item.id === id)
    if (!task) return

    const base: Task = {
      id: task.id,
      definitionId: task.definitionId,
      title: task.title,
      emoji: task.emoji,
      category: task.category,
      durationMinutes: task.durationMinutes,
      effects: { ...task.effects },
      requires: task.requires ? { ...task.requires } : undefined,
      deadline: { ...task.deadline },
      dueLabel: task.dueLabel,
      hint: task.hint,
      flexible: task.flexible,
    }
    this.state.placed = this.state.placed.filter((item) => item.id !== id)
    this.state.todo = [...this.state.todo, base]
    this.state.revision += 1
  }

  private startWeek(): void {
    this.state.holidays = generateWeekHolidays(this.rng)
    this.state.difficulty = computeDifficulty(this.state.week, this.state.coachingSkipped)
  }

  private startDay(): void {
    const day = this.state.dayIndex
    const holiday = this.state.holidays[day] ?? { school: false, coaching: false }
    this.schoolDoneToday = false
    this.coachingDoneToday = false

    const generated = [
      ...generateFixedTasks(this.rng, day, holiday.school, holiday.coaching),
      ...generateCareTasks(this.rng, day),
      ...generateOrdinaryTasks(this.rng, this.state.week, day),
    ]
    this.state.todo = [...this.state.todo, ...generated]

    if (holiday.school) this.notify(holiday.schoolReason ?? 'School holiday announced.', 'good')
    if (holiday.coaching) this.notify(holiday.coachingReason ?? 'Coaching holiday announced.', 'good')
    this.notify(`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day]} begins. ${generated.length} tasks waiting.`, 'info')
  }

  private advance(step: number): void {
    const state = this.state

    state.currentMinutes += step
    if (state.currentMinutes >= MINUTES_PER_DAY) {
      state.currentMinutes -= MINUTES_PER_DAY
      this.endDay()
      state.dayIndex += 1
      if (state.dayIndex > 6) {
        state.dayIndex = 0
        state.week += 1
        this.startWeek()
      }
      this.startDay()
    }

    const current = absoluteMinutes(state.dayIndex, state.currentMinutes)

    for (const task of [...state.placed]) {
      if (task.status === 'done' || task.status === 'failed' || task.status === 'skipped') continue
      const start = absoluteMinutes(task.day, task.startMinutes)
      const end = start + task.effectiveDurationMinutes

      if (current >= start && task.status === 'planned') {
        if (!meetsRequirements(state.stats, task.requires)) {
          const deadline = absoluteMinutes(task.deadline.day, task.deadline.minutes)
          state.placed = state.placed.filter((item) => item.id !== task.id)
          if (deadline > current) {
            this.returnTaskToTodo(task, 'Requirements unmet — find another slot')
            this.notify(`${task.title} skipped. Nera is not ready yet — back to to-do.`, 'warn')
          } else {
            this.failTask(task.title, 'Nera did not have the stats for it')
          }
          continue
        }
        task.status = 'active'
      }

      if (current >= end) {
        this.completeTask(task)
      }
    }

    for (const task of [...state.todo]) {
      const deadline = absoluteMinutes(task.deadline.day, task.deadline.minutes)
      if (deadline <= current) {
        state.todo = state.todo.filter((item) => item.id !== task.id)
        this.failTask(task.title, 'deadline passed')
      }
    }

    this.drainAccumulator += step
    while (this.drainAccumulator >= 60) {
      this.drainAccumulator -= 60
      state.stats = setStat(state.stats, 'stress', getStat(state.stats, 'stress') + 0.3 * state.difficulty)
      state.stats = setStat(state.stats, 'energy', getStat(state.stats, 'energy') - 0.5)
    }

    state.fastForward = this.timetableIsFull()
    state.revision += 1

    if (getStat(state.stats, 'stress') >= 100) {
      this.triggerEnding('Nera hit breaking point. Something had to change.')
    }
  }

  private returnTaskToTodo(task: PlacedTask, hint: string): void {
    const base: Task = {
      id: task.id,
      definitionId: task.definitionId,
      title: task.title,
      emoji: task.emoji,
      category: task.category,
      durationMinutes: task.durationMinutes,
      effects: { ...task.effects },
      requires: task.requires ? { ...task.requires } : undefined,
      deadline: { ...task.deadline },
      dueLabel: task.dueLabel,
      hint,
      flexible: task.flexible,
    }
    this.state.todo = [...this.state.todo, base]
  }

  private completeTask(task: PlacedTask): void {
    task.status = 'done'

    // Sleep is resolved by the daily audit so a short nap cannot grant the
    // full recovery bonus. Free time and every other task apply on completion.
    if (task.category !== 'sleep') {
      this.state.stats = applyEffects(this.state.stats, task.effects, this.state.difficulty)
    }

    if (task.category === 'school') this.schoolDoneToday = true
    if (task.category === 'coaching') this.coachingDoneToday = true

    if (task.category !== 'study' && task.category !== 'sleep') {
      this.notify(`${task.emoji} ${task.title} completed.`, 'good')
    }
  }

  private failTask(title: string, reason: string): void {
    const amount = FAILURE_STRESS * this.state.difficulty
    this.state.stats = setStat(this.state.stats, 'stress', getStat(this.state.stats, 'stress') + amount)
    this.notify(`${title} not completed — ${reason}. Stress spikes.`, 'danger')
  }

  private endDay(): void {
    const state = this.state
    const day = state.dayIndex
    const holiday = state.holidays[day] ?? { school: false, coaching: false }

    const sleep = this.sleepMinutesOnDay(day)
    if (sleep < 6 * 60) {
      state.stats = setStat(state.stats, 'stress', getStat(state.stats, 'stress') + LOW_SLEEP_STRESS)
      this.notify(`Only ${Math.floor(sleep / 60)}h ${sleep % 60}m of sleep. Nera is running on fumes.`, 'danger')
    } else {
      // Meeting the minimum keeps Nera steady; 8–10h gives the extra boost.
      state.stats = setStat(state.stats, 'energy', getStat(state.stats, 'energy') + 10)
      state.stats = setStat(state.stats, 'focus', getStat(state.stats, 'focus') + 5)
      if (sleep >= 8 * 60 && sleep <= 10 * 60) {
        state.stats = setStat(state.stats, 'energy', getStat(state.stats, 'energy') + 15)
        state.stats = setStat(state.stats, 'focus', getStat(state.stats, 'focus') + 15)
        this.notify(`${Math.floor(sleep / 60)}h of sleep. Energy and focus restored.`, 'good')
      }
    }

    if (hasSchool(day) && !holiday.school) {
      state.attendance = {
        total: state.attendance.total + 1,
        attended: state.attendance.attended + (this.schoolDoneToday ? 1 : 0),
      }
    }
    if (hasCoaching(day) && !holiday.coaching && !this.coachingDoneToday) {
      if (!state.coachingSkipped) {
        state.coachingSkipped = true
        state.difficulty = computeDifficulty(state.week, true)
        this.notify(`Coaching skipped. Every task just got ${state.difficulty.toFixed(2)}× harder.`, 'warn')
      }
    }

    if (isAttendanceLost(state.attendance) && !state.schoolLost) {
      state.schoolLost = true
      state.stats = setStat(state.stats, 'stress', 100)
      this.notify(`Attendance at ${Math.round(attendanceRatio(state.attendance) * 100)}%. Nera lost school.`, 'danger')
    }

    state.placed = state.placed.filter(
      (task) => task.status === 'planned' || task.status === 'active',
    )
    this.notify('The date changes.', 'info')
  }

  /** A night's sleep is credited to the day it was scheduled on, even if it
   *  stretches into the next morning (or across a week boundary). */
  private sleepMinutesOnDay(day: number): number {
    return this.state.placed.reduce((total, task) => {
      if (task.category !== 'sleep' || task.day !== day) return total
      return total + Math.min(task.effectiveDurationMinutes, 12 * 60)
    }, 0)
  }

  private timetableIsFull(): boolean {
    const day = this.state.dayIndex
    const occupied = this.state.placed.reduce((total, task) => {
      if (task.day !== day) return total
      const start = Math.max(0, task.startMinutes)
      const end = Math.min(MINUTES_PER_DAY, task.startMinutes + task.effectiveDurationMinutes)
      return total + Math.max(0, end - start)
    }, 0)
    return occupied / MINUTES_PER_DAY >= 0.9
  }

  private triggerEnding(reason: string): void {
    this.state.phase = 'ending'
    this.state.endingReason = reason
    this.state.revision += 1
  }

  finishEnding(): void {
    if (this.state.phase === 'ending') {
      this.state.phase = 'ended'
      this.state.revision += 1
    }
  }

  private notify(text: string, tone: GameNotification['tone']): void {
    this.notificationId += 1
    const item: GameNotification = {
      id: `n-${this.notificationId}`,
      time: formatClock(this.state.currentMinutes),
      text,
      tone,
    }
    this.state.notifications = [item, ...this.state.notifications].slice(0, 6)
  }
}
