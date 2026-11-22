/** Pure time helpers. No game-time progression lives here. */
export const MINUTES_PER_DAY = 24 * 60
export const SLOT_MINUTES = 15
export const SLOTS_PER_DAY = MINUTES_PER_DAY / SLOT_MINUTES
export const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function snapToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
}

export function clampStart(minutes: number, durationMinutes: number): number {
  const maxStart = MINUTES_PER_DAY - durationMinutes
  return Math.max(0, Math.min(maxStart, snapToSlot(minutes)))
}

export function formatDuration(minutes: number): string {
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const remainder = total % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

export function formatClock(minutes: number): string {
  return formatDuration(minutes)
}

export function formatDue(dayIndex: number, minutes: number): string {
  return `${WEEKDAYS[dayIndex]}/${formatClock(minutes)}`
}

export function absoluteMinutes(dayIndex: number, minutes: number): number {
  return dayIndex * MINUTES_PER_DAY + minutes
}

export function minutesToPercent(minutes: number): number {
  return (minutes / MINUTES_PER_DAY) * 100
}

export function percentToMinutes(percent: number): number {
  return (percent / 100) * MINUTES_PER_DAY
}
