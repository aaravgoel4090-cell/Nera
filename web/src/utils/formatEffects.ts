import type { StatEffects, StatId } from '../types/stats'

const LABEL: Record<StatId, string> = {
  stress: 'stress',
  energy: 'energy',
  passion: 'passion',
  focus: 'focus',
}

export function formatEffects(effects: StatEffects): string {
  const parts = (Object.entries(effects) as [StatId, number][])
    .filter(([, amount]) => amount !== 0)
    .map(([id, amount]) => `${amount > 0 ? '+' : ''}${amount} ${LABEL[id]}`)
  return parts.length > 0 ? parts.join(' · ') : 'No stat change'
}

export function formatRequirements(effects?: StatEffects): string {
  if (!effects) return ''
  return `needs ${formatEffects(effects).replace(/\+/g, '≥')}`
}
