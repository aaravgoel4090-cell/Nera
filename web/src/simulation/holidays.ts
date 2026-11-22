import type { DayHolidays } from '../types/gameState'
import type { SeededRng } from '../utils/rng'

const SCHOOL_HOLIDAY_CHANCE = 1 / 15
const COACHING_HOLIDAY_CHANCE = 1 / 45

const SCHOOL_REASONS = ['School declares a holiday', 'Local festival at school', 'School closes for the day']
const COACHING_REASONS = ['Coaching batch cancelled', 'Faculty meeting at coaching']

/** School runs Mon–Fri; coaching runs Mon–Sat. */
export function generateWeekHolidays(rng: SeededRng): DayHolidays[] {
  return Array.from({ length: 7 }, (_, day) => {
    const schoolPossible = day <= 4
    const coachingPossible = day <= 5

    const school = schoolPossible && rng.chance(SCHOOL_HOLIDAY_CHANCE)
    const coaching = coachingPossible && rng.chance(COACHING_HOLIDAY_CHANCE)

    return {
      school,
      coaching,
      schoolReason: school ? rng.pick(SCHOOL_REASONS) : undefined,
      coachingReason: coaching ? rng.pick(COACHING_REASONS) : undefined,
    }
  })
}

export function hasSchool(dayIndex: number): boolean {
  return dayIndex <= 4
}

export function hasCoaching(dayIndex: number): boolean {
  return dayIndex <= 5
}
