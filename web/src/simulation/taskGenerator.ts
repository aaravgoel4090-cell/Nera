import type { StatEffects } from '../types/stats'
import type { PlacedTask, Task, TaskCategory } from '../types/task'
import type { SeededRng } from '../utils/rng'
import { formatDue, snapToSlot } from './clock'
import { deadlineSlack, tasksPerDay } from './difficulty'
import { hasCoaching, hasSchool } from './holidays'

interface TaskDefinition {
  id: string
  title: string
  emoji: string
  category: TaskCategory
  durationMinutes: number
  effects: StatEffects
  requires?: StatEffects
  flexible?: boolean
  minWeek?: number
}

/** Predefined task names. The generator only picks and instances these. */
const LIBRARY: readonly TaskDefinition[] = [
  {
    id: 'school',
    title: 'School · Class 11 PCM',
    emoji: '🏫',
    category: 'school',
    durationMinutes: 360,
    effects: { energy: -12, focus: 6, stress: 2, passion: 1 },
  },
  {
    id: 'coaching',
    title: 'Coaching · PCM Batch',
    emoji: '📚',
    category: 'coaching',
    durationMinutes: 180,
    effects: { energy: -10, focus: 5, stress: 4, passion: 1 },
  },
  {
    id: 'sleep',
    title: 'Sleep',
    emoji: '😴',
    category: 'sleep',
    durationMinutes: 360,
    effects: { energy: 20, focus: 14, stress: -12 },
    flexible: true,
  },
  {
    id: 'free',
    title: 'Free Time',
    emoji: '🌿',
    category: 'free',
    durationMinutes: 120,
    effects: { energy: 8, focus: 6, passion: 4, stress: -10 },
    flexible: true,
  },
  {
    id: 'physics',
    title: 'Physics Numericals',
    emoji: '⚛️',
    category: 'study',
    durationMinutes: 90,
    effects: { energy: -7, focus: 6, stress: -3, passion: 2 },
  },
  {
    id: 'chem',
    title: 'Organic Chem Notes',
    emoji: '🧪',
    category: 'study',
    durationMinutes: 60,
    effects: { energy: -5, focus: 4, stress: -2, passion: 1 },
  },
  {
    id: 'calculus',
    title: 'Calculus Practice',
    emoji: '📐',
    category: 'study',
    durationMinutes: 75,
    effects: { energy: -7, focus: 6, stress: -3 },
  },
  {
    id: 'formulas',
    title: 'Revise Formulas',
    emoji: '📝',
    category: 'study',
    durationMinutes: 30,
    effects: { energy: -2, focus: 3, stress: -2 },
  },
  {
    id: 'mock',
    title: 'Mock Test Analysis',
    emoji: '📊',
    category: 'study',
    durationMinutes: 120,
    requires: { focus: 55 },
    effects: { energy: -12, focus: 8, stress: 4, passion: 2 },
    minWeek: 1,
  },
  {
    id: 'python',
    title: 'Learn Python Basics',
    emoji: '🐍',
    category: 'misc',
    durationMinutes: 60,
    effects: { energy: -4, focus: 5, passion: 8, stress: -3 },
  },
  {
    id: 'education-research',
    title: 'Research Indian Education',
    emoji: '🔍',
    category: 'misc',
    durationMinutes: 90,
    requires: { focus: 45 },
    effects: { energy: -5, focus: 4, passion: 10, stress: -4 },
  },
  {
    id: 'build-app',
    title: 'Build a Small App',
    emoji: '🛠️',
    category: 'misc',
    durationMinutes: 120,
    requires: { passion: 45, energy: 35 },
    effects: { energy: -10, focus: 6, passion: 12, stress: -6 },
    minWeek: 2,
  },
  {
    id: 'hackclub',
    title: 'Hack Club Call',
    emoji: '💻',
    category: 'misc',
    durationMinutes: 90,
    requires: { passion: 40 },
    effects: { energy: -4, focus: 5, passion: 14, stress: -10 },
    minWeek: 2,
  },
  {
    id: 'home',
    title: 'Errands at Home',
    emoji: '🏠',
    category: 'misc',
    durationMinutes: 45,
    effects: { energy: -4, stress: -3 },
  },
  {
    id: 'family',
    title: 'Family Time',
    emoji: '🫶',
    category: 'misc',
    durationMinutes: 60,
    effects: { stress: -8, passion: 3, energy: 2 },
  },
]

const ORDINARY = LIBRARY.filter((task) => !['school', 'coaching', 'sleep', 'free'].includes(task.id))

function instantiate(
  definition: TaskDefinition,
  rng: SeededRng,
  deadlineDay: number,
  deadlineMinutes: number,
  hint: string,
): Task {
  return {
    id: `t-${rng.int(0, Number.MAX_SAFE_INTEGER)}`,
    definitionId: definition.id,
    title: definition.title,
    emoji: definition.emoji,
    category: definition.category,
    durationMinutes: definition.durationMinutes,
    effects: { ...definition.effects },
    requires: definition.requires ? { ...definition.requires } : undefined,
    deadline: { day: deadlineDay, minutes: deadlineMinutes },
    dueLabel: formatDue(deadlineDay, deadlineMinutes),
    hint,
    flexible: Boolean(definition.flexible),
  }
}

function define(id: string): TaskDefinition {
  const found = LIBRARY.find((task) => task.id === id)
  if (!found) throw new Error(`Unknown task definition: ${id}`)
  return found
}

/** School and coaching are fixed slots and are only issued on working days. */
export function generateFixedTasks(
  rng: SeededRng,
  dayIndex: number,
  schoolHoliday: boolean,
  coachingHoliday: boolean,
): Task[] {
  const tasks: Task[] = []
  if (hasSchool(dayIndex) && !schoolHoliday) {
    tasks.push(instantiate(define('school'), rng, dayIndex, 14 * 60, '8:00 – 14:00 · one per day'))
  }
  if (hasCoaching(dayIndex) && !coachingHoliday) {
    tasks.push(instantiate(define('coaching'), rng, dayIndex, 19 * 60, '16:00 – 19:00 · one per day'))
  }
  return tasks
}

/** Sleep appears on every one of the seven days, including Sunday. */
export function generateCareTasks(rng: SeededRng, dayIndex: number): Task[] {
  const lastDay = dayIndex === 6
  return [
    instantiate(
      define('sleep'),
      rng,
      lastDay ? 6 : dayIndex + 1,
      lastDay ? 23 * 60 + 45 : 12 * 60,
      'Flexible · right edge is open',
    ),
    instantiate(define('free'), rng, dayIndex, 23 * 60 + 45, 'Flexible · fills a free gap'),
  ]
}

export function generateOrdinaryTasks(rng: SeededRng, week: number, dayIndex: number): Task[] {
  const pool = ORDINARY.filter((task) => (task.minWeek ?? 1) <= week)
  const count = tasksPerDay(week)
  const slack = deadlineSlack(week)
  const tasks: Task[] = []

  for (let index = 0; index < count; index += 1) {
    const definition = rng.pick(pool)
    const dayOffset = rng.int(0, Math.min(2, 6 - dayIndex))
    const deadlineDay = dayIndex + dayOffset
    const latest = snapToSlot(22 * 60 - rng.int(0, 4) * 60)
    const earliest = 9 * 60 + rng.int(0, 4) * 60
    const deadlineMinutes = Math.min(latest, Math.max(earliest, 18 * 60 - slack / 4 + rng.int(0, 4) * 60))
    tasks.push(
      instantiate(
        definition,
        rng,
        deadlineDay,
        deadlineMinutes,
        definition.requires ? 'Needs the required stats' : 'Drag onto a free slot',
      ),
    )
  }

  return tasks
}

export function toPlaced(task: Task, day: number, startMinutes: number, effectiveDuration = task.durationMinutes): PlacedTask {
  return {
    ...task,
    day,
    startMinutes,
    effectiveDurationMinutes: effectiveDuration,
    status: 'planned',
  }
}
