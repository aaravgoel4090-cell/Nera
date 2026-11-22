export const COACHING_SKIP_MULTIPLIER = 1.5
export const WEEK_RAMP = 0.12

export function computeDifficulty(week: number, coachingSkipped: boolean): number {
  const base = 1 + Math.max(0, week - 1) * WEEK_RAMP
  return Math.round(base * (coachingSkipped ? COACHING_SKIP_MULTIPLIER : 1) * 100) / 100
}

/** Number of new ordinary tasks generated each day. Tightens towards impossible. */
export function tasksPerDay(week: number): number {
  return Math.min(12, 3 + (week - 1) * 2)
}

/** Deadline slack in minutes. Shrinks as the game ramps up. */
export function deadlineSlack(week: number): number {
  return Math.max(90, 660 - (week - 1) * 120)
}
