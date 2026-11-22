import { MINUTES_PER_DAY, SLOT_MINUTES, snapToSlot } from './clock'
import { canPlace } from './scheduler'
import type { PlacedTask, Task } from '../types/task'
import type { DayHolidays } from '../types/gameState'
import { hasCoaching, hasSchool } from './holidays'

export interface PlacementResult {
  ok: boolean
  reason: string
  startMinutes: number
  effectiveDurationMinutes: number
}

export interface FlexibleSpan {
  startMinutes: number
  durationMinutes: number
}

const SCHOOL_START = 8 * 60
const SCHOOL_DURATION = 6 * 60
const COACHING_START = 16 * 60
const COACHING_DURATION = 3 * 60

/** Everything occupying this day, including sleep spilling in from yesterday. */
function occupiedOnDay(
  placed: readonly PlacedTask[],
  day: number,
  ignoreId?: string,
): Array<{ start: number; end: number }> {
  const dayStart = day * MINUTES_PER_DAY
  const dayEnd = dayStart + MINUTES_PER_DAY
  const ranges = placed
    .filter((task) => task.id !== ignoreId)
    .map((task) => {
      const absoluteStart = task.day * MINUTES_PER_DAY + task.startMinutes
      const absoluteEnd = absoluteStart + task.effectiveDurationMinutes
      return {
        start: Math.max(0, Math.max(absoluteStart, dayStart) - dayStart),
        end: Math.min(MINUTES_PER_DAY, Math.min(absoluteEnd, dayEnd) - dayStart),
      }
    })
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start)
  return ranges
}

/**
 * Flexible tasks snap into the free gap that contains the drop point. Sleep is
 * allowed to be shorter than six hours — the daily audit penalises that, rather
 * than the placement being rejected.
 */
export function expandFlexible(
  task: Task,
  placed: readonly PlacedTask[],
  day: number,
  rawStart: number,
  ignoreId?: string,
): FlexibleSpan {
  const requested = Math.max(0, Math.min(MINUTES_PER_DAY - SLOT_MINUTES, snapToSlot(rawStart)))
  const ranges = occupiedOnDay(placed, day, ignoreId)

  let gapStart = 0
  let gapEnd = MINUTES_PER_DAY

  for (const range of ranges) {
    if (range.end <= requested) {
      gapStart = Math.max(gapStart, range.end)
    } else if (range.start >= requested) {
      gapEnd = Math.min(gapEnd, range.start)
      break
    } else {
      // Dropped on top of a task — shift to the free space right after it.
      gapStart = range.end
      const next = ranges.find((candidate) => candidate.start >= range.end)
      gapEnd = next ? next.start : MINUTES_PER_DAY
      break
    }
  }

  let startMinutes = Math.min(Math.max(requested, gapStart), gapEnd)
  let durationMinutes = gapEnd - startMinutes

  if (durationMinutes < SLOT_MINUTES) {
    startMinutes = Math.min(gapEnd, MINUTES_PER_DAY - SLOT_MINUTES)
    durationMinutes = SLOT_MINUTES
  }

  if (task.category === 'sleep' && gapEnd === MINUTES_PER_DAY) {
    // End-of-day sleep also covers the next morning, stopping at the first
    // real commitment on the following day.
    const commitments = placed
      .filter((item) =>
        item.id !== ignoreId &&
        item.day === day + 1 &&
        item.category !== 'free' &&
        item.category !== 'sleep',
      )
      .map((item) => item.startMinutes)
    // Seven days wrap to Monday next week, whose tasks do not exist yet.
    // Without a known first commitment, assume an 08:00 start.
    const nextDayFirst = commitments.length > 0 ? Math.min(...commitments) : 8 * 60
    durationMinutes += nextDayFirst
  }

  if (task.category === 'free') {
    durationMinutes = Math.min(durationMinutes, 8 * 60)
  }

  durationMinutes = snapToSlot(Math.min(durationMinutes, MINUTES_PER_DAY * 2))
  return { startMinutes, durationMinutes }
}

export function validatePlacement(
  task: Task,
  placed: readonly PlacedTask[],
  holidays: readonly DayHolidays[],
  day: number,
  rawStart: number,
  ignoreId?: string,
): PlacementResult {
  const holiday = holidays[day] ?? { school: false, coaching: false }

  if (task.category === 'school') {
    if (!hasSchool(day)) return { ok: false, reason: 'School only runs Monday to Friday', startMinutes: rawStart, effectiveDurationMinutes: task.durationMinutes }
    if (holiday.school) return { ok: false, reason: `School is closed today — ${holiday.schoolReason ?? 'holiday'}`, startMinutes: rawStart, effectiveDurationMinutes: task.durationMinutes }
    if (placed.some((item) => item.id !== ignoreId && item.category === 'school' && item.day === day)) {
      return { ok: false, reason: 'Only one school block per day', startMinutes: rawStart, effectiveDurationMinutes: task.durationMinutes }
    }
  }

  if (task.category === 'coaching') {
    if (!hasCoaching(day)) return { ok: false, reason: 'Coaching only runs Monday to Saturday', startMinutes: rawStart, effectiveDurationMinutes: task.durationMinutes }
    if (holiday.coaching) return { ok: false, reason: `Coaching is closed today — ${holiday.coachingReason ?? 'holiday'}`, startMinutes: rawStart, effectiveDurationMinutes: task.durationMinutes }
    if (placed.some((item) => item.id !== ignoreId && item.category === 'coaching' && item.day === day)) {
      return { ok: false, reason: 'Only one coaching block per day', startMinutes: rawStart, effectiveDurationMinutes: task.durationMinutes }
    }
  }

  let startMinutes = snapToSlot(rawStart)
  let effectiveDurationMinutes = task.durationMinutes

  if (task.category === 'school') startMinutes = SCHOOL_START
  if (task.category === 'coaching') startMinutes = COACHING_START
  if (task.category === 'school') effectiveDurationMinutes = SCHOOL_DURATION
  if (task.category === 'coaching') effectiveDurationMinutes = COACHING_DURATION

  if (task.flexible) {
    const span = expandFlexible(task, placed, day, startMinutes, ignoreId)
    startMinutes = span.startMinutes
    effectiveDurationMinutes = span.durationMinutes
  }

  const ranges = placed.map((item) => ({
    id: item.id,
    day: item.day,
    startMinutes: item.startMinutes,
    durationMinutes: item.effectiveDurationMinutes,
  }))

  if (!canPlace(ranges, { day, startMinutes, durationMinutes: effectiveDurationMinutes }, ignoreId)) {
    return { ok: false, reason: 'That slot overlaps another task', startMinutes, effectiveDurationMinutes }
  }

  if (startMinutes + effectiveDurationMinutes > MINUTES_PER_DAY * 2) {
    return { ok: false, reason: 'Sleep cannot stretch that far', startMinutes, effectiveDurationMinutes }
  }

  return { ok: true, reason: '', startMinutes, effectiveDurationMinutes }
}
