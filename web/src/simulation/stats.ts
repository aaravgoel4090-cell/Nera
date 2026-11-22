import type { Stat, StatEffects, StatId, StatStatus } from '../types/stats'

export const STAT_DEFS: ReadonlyArray<Omit<Stat, 'value'>> = [
  {
    id: 'stress',
    name: 'Stress',
    max: 100,
    description: 'Pressure Nera is carrying. At 100 she reaches breaking point.',
  },
  {
    id: 'energy',
    name: 'Energy',
    max: 100,
    description: 'Physical energy. Sleep and free time restore it.',
  },
  {
    id: 'passion',
    name: 'Passion / CS',
    max: 100,
    description: 'Her drive to learn, build and change education.',
  },
  {
    id: 'focus',
    name: 'Focus',
    max: 100,
    description: 'How easily Nera settles into difficult work.',
  },
]

const STATUS_COLOR: Record<StatStatus, string> = {
  good: '#6ec6a5',
  warning: '#e0b264',
  danger: '#e27072',
}

export function createInitialStats(): Stat[] {
  return STAT_DEFS.map((stat) => ({
    ...stat,
    value: stat.id === 'stress' ? 28 : stat.id === 'energy' ? 72 : stat.id === 'passion' ? 40 : 62,
  }))
}

export function getStat(stats: readonly Stat[], id: StatId): number {
  return stats.find((stat) => stat.id === id)?.value ?? 0
}

export function setStat(stats: Stat[], id: StatId, value: number): Stat[] {
  return stats.map((stat) =>
    stat.id === id
      ? { ...stat, value: Math.max(0, Math.min(stat.max, Math.round(value * 10) / 10)) }
      : stat,
  )
}

/** True when a higher value is dangerous (only stress). */
function isHarmful(id: StatId): boolean {
  return id === 'stress'
}

/** Skipping coaching makes helpful effects weaker and harmful effects stronger. */
export function scaleEffects(effects: StatEffects, difficulty: number): StatEffects {
  const scaled: StatEffects = {}
  for (const [id, amount] of Object.entries(effects) as [StatId, number][]) {
    if (amount === 0) continue
    const beneficial = isHarmful(id) ? amount < 0 : amount > 0
    scaled[id] = beneficial ? amount / difficulty : amount * difficulty
  }
  return scaled
}

export function applyEffects(stats: Stat[], effects: StatEffects, difficulty = 1): Stat[] {
  let next = stats
  const scaled = scaleEffects(effects, difficulty)
  for (const [id, amount] of Object.entries(scaled) as [StatId, number][]) {
    next = setStat(next, id, getStat(next, id) + amount)
  }
  return next
}

export function statStatus(stat: Stat): StatStatus {
  const ratio = stat.value / Math.max(1, stat.max)
  if (stat.id === 'stress') {
    if (ratio >= 0.7) return 'danger'
    if (ratio >= 0.45) return 'warning'
    return 'good'
  }
  if (ratio <= 0.3) return 'danger'
  if (ratio <= 0.55) return 'warning'
  return 'good'
}

export function statColor(stat: Stat): string {
  return stat.color ?? STATUS_COLOR[statStatus(stat)]
}

export function meetsRequirements(stats: readonly Stat[], requires?: StatEffects): boolean {
  if (!requires) return true
  return (Object.entries(requires) as [StatId, number][]).every(
    ([id, minimum]) => getStat(stats, id) >= minimum,
  )
}
