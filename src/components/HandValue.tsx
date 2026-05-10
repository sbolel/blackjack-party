import { motion, AnimatePresence } from 'framer-motion'
import { calculateHandValues } from '@/lib/gameLogic'
import { Card } from '@/lib/types'
import { useEffect, useState } from 'react'

interface HandValueProps {
  hand: Card[]
  className?: string
}

function Sparkle({ delay }: { delay: number }) {
  const angle = Math.random() * 360
  const distance = 40 + Math.random() * 40
  const duration = 0.6 + Math.random() * 0.4

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-gold"
      initial={{ 
        opacity: 1, 
        scale: 0,
        x: 0,
        y: 0,
      }}
      animate={{
        opacity: 0,
        scale: [0, 1, 0.5],
        x: Math.cos(angle * Math.PI / 180) * distance,
        y: Math.sin(angle * Math.PI / 180) * distance,
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut'
      }}
      style={{
        boxShadow: '0 0 8px var(--gold)'
      }}
    />
  )
}

export function HandValue({ hand, className = '' }: HandValueProps) {
  const { low, high, hasAce } = calculateHandValues(hand)
  const [showSparkles, setShowSparkles] = useState(false)
  const [previousValue, setPreviousValue] = useState<number | null>(null)

  const displayValue = low
  const isBlackjack = low === 21

  useEffect(() => {
    if (isBlackjack && previousValue !== 21 && previousValue !== null) {
      setShowSparkles(true)
      const timer = setTimeout(() => setShowSparkles(false), 1000)
      return () => clearTimeout(timer)
    }
    setPreviousValue(displayValue)
  }, [isBlackjack, displayValue, previousValue])

  const getValueColor = (value: number) => {
    if (value > 21) return 'text-red-500'
    if (value === 21) return 'text-green-500'
    return 'text-foreground'
  }

  if (hand.length === 0) return null

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      <span className="text-sm">Hand value:</span>
      <div className="relative inline-flex items-center">
        {hasAce && high !== low ? (
          <span className="font-mono font-bold text-lg">
            <span className={getValueColor(low)}>{low}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className={getValueColor(high)}>{high}</span>
          </span>
        ) : (
          <span className={`font-mono font-bold text-lg ${getValueColor(displayValue)}`}>
            {displayValue}
          </span>
        )}
        
        <AnimatePresence>
          {showSparkles && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <Sparkle key={i} delay={i * 0.03} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
