export type StatId = 'stress' | 'energy' | 'passion' | 'focus'

export type StatStatus = 'good' | 'warning' | 'danger'

export interface Stat {
  id: StatId
  name: string
  value: number
  max: number
  description: string
  color?: string
}

/** Positive values help the named stat. For stress, positive means pressure. */
export type StatEffects = Partial<Record<StatId, number>>
