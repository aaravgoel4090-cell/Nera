import { motion, AnimatePresence } from 'framer-motion'
import type { GameNotification } from '../../types/gameState'
import './Notifications.css'

interface NotificationsProps {
  items: GameNotification[]
}

export function Notifications({ items }: NotificationsProps) {
  return (
    <aside className="notifications" aria-label="Game notifications">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className={`notification notification--${item.tone}`}
            initial={{ opacity: 0, x: -18, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            layout
          >
            <span className="notification__time">{item.time}</span>
            <span className="notification__text">{item.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </aside>
  )
}
