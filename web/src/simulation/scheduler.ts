import { absoluteMinutes, MINUTES_PER_DAY } from './clock'

/** Pure placement rules. All ranges use absolute minutes from Monday 00:00. */
export interface TimeRange {
  id?: string
  day: number
  startMinutes: number
  durationMinutes: number
}

interface AbsoluteRange {
  start: number
  end: number
}

function toAbsolute(range: TimeRange): AbsoluteRange {
  const start = absoluteMinutes(range.day, range.startMinutes)
  return { start, end: start + range.durationMinutes }
}

export function rangesOverlap(a: AbsoluteRange, b: AbsoluteRange): boolean {
  return a.start < b.end && b.start < a.end
}

export function isWithinDay(startMinutes: number, durationMinutes: number): boolean {
  return startMinutes >= 0 && startMinutes + durationMinutes <= MINUTES_PER_DAY
}

export function canPlace(
  placed: readonly TimeRange[],
  candidate: TimeRange,
  ignoreId?: string,
): boolean {
  if (candidate.startMinutes < 0) return false

  const candidateRange = toAbsolute(candidate)
  return !placed.some((entry) => {
    if (ignoreId && entry.id === ignoreId) return false
    return rangesOverlap(candidateRange, toAbsolute(entry))
  })
}
