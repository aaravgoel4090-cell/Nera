import { AnimatePresence, motion } from 'framer-motion'
import type { DragEvent } from 'react'
import type { Task } from '../../types/task'
import { TaskCard } from '../TaskCard/TaskCard'
import './TodoPanel.css'

interface TodoPanelProps {
  tasks: Task[]
  draggingId?: string
  canReturn?: boolean
  onDragBegin: (task: Task) => void
  onDragEnd: () => void
  onDropOnTodo: () => void
}

export function TodoPanel({
  tasks,
  draggingId,
  canReturn = false,
  onDragBegin,
  onDragEnd,
  onDropOnTodo,
}: TodoPanelProps) {
  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!canReturn) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  return (
    <section
      className={`panel todo-panel${canReturn ? ' todo-panel--droppable' : ''}`}
      aria-labelledby="todo-heading"
      onDragOver={handleDragOver}
      onDrop={(event) => {
        if (!canReturn) return
        event.preventDefault()
        onDropOnTodo()
      }}
    >
      <header className="panel__header">
        <div>
          <p className="panel__eyebrow">Incoming</p>
          <h2 id="todo-heading">TO-DO</h2>
        </div>
        <span className="panel__count">{tasks.length}</span>
      </header>

      <p className="todo-panel__hint">Drag a card onto a free slot. Hover to see what it does to Nera.</p>

      <div className="todo-panel__list">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: draggingId === task.id ? 0.45 : 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              layout
            >
              <TaskCard task={task} onDragBegin={onDragBegin} onDragEnd={onDragEnd} />
            </motion.div>
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="todo-panel__empty">Nothing waiting. The calm never lasts.</div>
        )}
      </div>
    </section>
  )
}
