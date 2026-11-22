import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './Cutscene.css'

interface CutsceneProps {
  kind: 'intro' | 'ending'
  reason?: string
  onComplete: () => void
}

const DURATION_MS = 3000

export function Cutscene({ kind, reason, onComplete }: CutsceneProps) {
  const completeRef = useRef(onComplete)
  useEffect(() => {
    completeRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const timer = window.setTimeout(() => completeRef.current(), DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <motion.div
      className="cutscene"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="cutscene__card"
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="cutscene__tag">Video placeholder · {DURATION_MS / 1000}s</span>
        <div className="cutscene__video">
          <span className="cutscene__glyph">{kind === 'intro' ? '🌒' : '🌅'}</span>
          <span className="cutscene__title">
            {kind === 'intro' ? 'A timetable that never fits' : 'The only way out is up'}
          </span>
          <span className="cutscene__sub">
            {kind === 'intro'
              ? 'Class 11 PCM. School, coaching, and a dream about fixing education.'
              : reason ?? 'Nera reaches breaking point — and starts again, differently.'}
          </span>
        </div>
        <div className="cutscene__progress"><span /></div>
      </motion.div>
    </motion.div>
  )
}
