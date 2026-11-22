import type { CSSProperties, DragEvent } from 'react'
import { motion } from 'framer-motion'
import { formatDuration } from '../../simulation/clock'
import {
  TASK_CATEGORY_COLOR,
  TASK_CATEGORY_LABEL,
  type PlacedTask,
  type Task,
} from '../../types/task'
import { formatEffects, formatRequirements } from '../../utils/formatEffects'
import './TaskCard.css'

interface TaskCardProps {
  task: Task | PlacedTask
  variant?: 'todo' | 'block'
  onDragBegin?: (task: Task) => void
  onDragEnd?: () => void
  onReturn?: (id: string) => void
  compact?: boolean
}

function cardStyle(task: Task | PlacedTask): CSSProperties {
  return { '--task-color': TASK_CATEGORY_COLOR[task.category] } as CSSProperties
}

function EffectsTooltip({ task }: { task: Task | PlacedTask }) {
  return (
    <div className="task-tooltip" role="tooltip">
      <strong>{task.title}</strong>
      <span className="task-tooltip__line">{formatEffects(task.effects)}</span>
      {task.requires && (
        <span className="task-tooltip__line task-tooltip__line--req">
          {formatRequirements(task.requires)}
        </span>
      )}
      <span className="task-tooltip__line task-tooltip__line--muted">
        Due {task.dueLabel} · {TASK_CATEGORY_LABEL[task.category]}
      </span>
    </div>
  )
}

export function TaskCard({
  task,
  variant = 'todo',
  onDragBegin,
  onDragEnd,
  onReturn,
  compact = false,
}: TaskCardProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('text/plain', task.id)
    event.dataTransfer.effectAllowed = 'move'
    onDragBegin?.(task)
  }

  if (variant === 'block') {
    const placed = task as PlacedTask
    return (
      <motion.div
        className={`task-block task-block--${placed.status}${compact ? ' task-block--compact' : ''}`}
        style={cardStyle(task)}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        layout
      >
        <div className="task-block__main" draggable onDragStart={handleDragStart} onDragEnd={onDragEnd}>
          <span className="task-block__emoji">{task.emoji}</span>
          {!compact && <span className="task-block__title">{task.title}</span>}
        </div>
        {onReturn && (
          <button
            type="button"
            className="task-block__return"
            aria-label={`Return ${task.title} to to-do`}
            onClick={() => onReturn(task.id)}
          >
            ↩
          </button>
        )}
        <EffectsTooltip task={task} />
      </motion.div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.14 }}
      layout
    >
      <div
        className={`task-card${task.flexible ? ' task-card--flexible' : ''}`}
        style={cardStyle(task)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        tabIndex={0}
      >
        <div className="task-card__top">
          <span className="task-card__emoji" aria-hidden="true">{task.emoji}</span>
          <span className="task-card__name">{task.title}</span>
        </div>
        <div className="task-card__meta">
          <span className="task-card__duration">{formatDuration(task.durationMinutes)}</span>
          <span className="task-card__due">{task.dueLabel}</span>
        </div>
        <div className="task-card__footer">
          <span className="task-card__category">{TASK_CATEGORY_LABEL[task.category]}</span>
          <span className="task-card__hint">{task.hint}</span>
        </div>
        {task.requires && <span className="task-card__req">⚑ requires stats</span>}
        <EffectsTooltip task={task} />
      </div>
    </motion.div>
  )
}
