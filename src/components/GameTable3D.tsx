import { Player, Card } from '@/lib/types'
import { getCardSymbol, getCardColor, calculateHandValues } from '@/lib/gameLogic'
import { Badge } from './ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface GameTable3DProps {
  players: Player[]
  dealerHand: Card[]
  dealerRevealed: boolean
  currentPlayerId?: string
}

function Sparkle({ delay }: { delay: number }) {
  const angle = Math.random() * 360
  const distance = 30 + Math.random() * 30
  const duration = 0.6 + Math.random() * 0.4

  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full bg-gold"
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
        boxShadow: '0 0 6px var(--gold)'
      }}
    />
  )
}

interface HandValueDisplayProps {
  hand: Card[]
  revealed?: boolean
}

function HandValueDisplay({ hand, revealed = true }: HandValueDisplayProps) {
  const [showSparkles, setShowSparkles] = useState(false)
  const [previousValue, setPreviousValue] = useState<number | null>(null)

  if (!revealed || hand.length === 0) return null

  const { low, high, hasAce } = calculateHandValues(hand)
  const displayValue = low
  const isBust = low > 21
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
    if (value === 21) return 'text-green-400'
    return 'text-white'
  }

  return (
    <div className="relative mt-2 text-sm font-bold">
      {hasAce && high !== low ? (
        <div className="flex items-center gap-1">
          <span className={getValueColor(low)}>{low}</span>
          <span className="text-white/50">/</span>
          <span className={getValueColor(high)}>{high}</span>
        </div>
      ) : (
        <span className={getValueColor(displayValue)}>{displayValue}</span>
      )}
      
      <AnimatePresence>
        {showSparkles && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <Sparkle key={i} delay={i * 0.03} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlayingCard({ card, faceUp, delay = 0 }: { card: Card; faceUp: boolean; delay?: number }) {
  if (!faceUp) {
    return (
      <motion.div
        initial={{ rotateY: 180, scale: 0.8 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ duration: 0.4, delay }}
        className="w-16 h-24 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-gold flex items-center justify-center shadow-2xl"
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.3)'
        }}
      >
        <div className="text-gold text-xl font-bold">♠♥♣♦</div>
      </motion.div>
    )
  }

  const symbol = getCardSymbol(card.suit)
  const color = getCardColor(card.suit)

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8, y: -50 }}
      animate={{ rotateY: 0, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="w-16 h-24 rounded-lg bg-white border-2 border-gray-300 flex flex-col p-2"
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold" style={{ color }}>
          {card.rank}
        </span>
        <span className="text-lg" style={{ color }}>
          {symbol}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="text-3xl" style={{ color }}>
          {symbol}
        </span>
      </div>
      <div className="flex flex-col items-end rotate-180">
        <span className="text-xs font-bold" style={{ color }}>
          {card.rank}
        </span>
        <span className="text-lg" style={{ color }}>
          {symbol}
        </span>
      </div>
    </motion.div>
  )
}

export function GameTable3D({ players, dealerHand, dealerRevealed, currentPlayerId }: GameTable3DProps) {
  const isValidCard = (card: any): card is Card => {
    return !!(card && typeof card === 'object' && card.id && card.suit && card.rank)
  }

  const validDealerHand = Array.isArray(dealerHand) ? dealerHand.filter(isValidCard) : []

  const getPlayerPosition = (index: number, total: number) => {
    if (total === 1) return { bottom: '10%', left: '50%', transform: 'translateX(-50%)' }
    if (total === 2) {
      return index === 0 
        ? { bottom: '10%', left: '25%', transform: 'translateX(-50%)' }
        : { bottom: '10%', left: '75%', transform: 'translateX(-50%)' }
    }
    if (total === 3) {
      const positions = [
        { bottom: '10%', left: '20%', transform: 'translateX(-50%)' },
        { bottom: '10%', left: '50%', transform: 'translateX(-50%)' },
        { bottom: '10%', left: '80%', transform: 'translateX(-50%)' }
      ]
      return positions[index]
    }
    const positions = [
      { bottom: '10%', left: '15%', transform: 'translateX(-50%)' },
      { bottom: '10%', left: '38%', transform: 'translateX(-50%)' },
      { bottom: '10%', left: '62%', transform: 'translateX(-50%)' },
      { bottom: '10%', left: '85%', transform: 'translateX(-50%)' }
    ]
    return positions[index]
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden rounded-lg"
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 30%'
      }}
    >
      <div
        className="w-full h-full absolute inset-0"
        style={{
          transform: 'rotateX(25deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        <div className="w-full h-full relative bg-gradient-to-br from-green-800 via-green-900 to-green-950 rounded-lg shadow-2xl">
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.03) 35px, rgba(255,255,255,0.03) 70px),
                repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(0,0,0,0.05) 35px, rgba(0,0,0,0.05) 70px)
              `
            }}
          />

          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full border-4 border-gold/30"
            style={{
              boxShadow: 'inset 0 0 40px rgba(212,175,55,0.1)'
            }}
          />

          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
            <Badge 
              variant="secondary" 
              className="text-xs px-3 py-1 shadow-lg"
              style={{
                transform: 'rotateX(-25deg)',
                transformStyle: 'preserve-3d'
              }}
            >
              DEALER
            </Badge>
            <div className="flex flex-col items-center gap-1" style={{ transform: 'rotateX(-10deg)', transformStyle: 'preserve-3d' }}>
              <div className="flex gap-2">
                {validDealerHand.map((card, index) => (
                  <PlayingCard
                    key={`dealer-${card.id}-${index}`}
                    card={card}
                    faceUp={dealerRevealed || index === 0}
                    delay={index * 0.15}
                  />
                ))}
              </div>
              <HandValueDisplay hand={validDealerHand} revealed={dealerRevealed} />
            </div>
          </div>

          {players.map((player, index) => {
            if (!player || !player.id) return null
            const isCurrentPlayer = player.id === currentPlayerId
            const validPlayerHand = player.hand.filter(isValidCard)
            const position = getPlayerPosition(index, players.length)

            return (
              <motion.div
                key={`player-${player.id}`}
                className="absolute"
                style={{
                  ...position,
                  transformStyle: 'preserve-3d'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className={`flex flex-col items-center gap-3 p-4 rounded-lg backdrop-blur-sm transition-all ${
                    isCurrentPlayer
                      ? 'bg-gold/30 border-2 border-gold shadow-2xl'
                      : 'bg-black/20 border border-white/20'
                  }`}
                  style={{
                    transform: 'rotateX(-15deg)',
                    transformStyle: 'preserve-3d',
                    boxShadow: isCurrentPlayer 
                      ? '0 15px 40px rgba(212,175,55,0.5), 0 0 30px rgba(212,175,55,0.3)'
                      : '0 10px 25px rgba(0,0,0,0.3)'
                  }}
                >
                  <Badge 
                    variant={isCurrentPlayer ? 'default' : 'outline'} 
                    className="text-xs whitespace-nowrap shadow-md"
                  >
                    {player.name}
                  </Badge>
                  <div className="flex gap-2">
                    {validPlayerHand.map((card, cardIndex) => (
                      <PlayingCard
                        key={`player-${player.id}-${card.id}-${cardIndex}`}
                        card={card}
                        faceUp
                        delay={cardIndex * 0.1}
                      />
                    ))}
                  </div>
                  {validPlayerHand.length > 0 && (
                    <HandValueDisplay hand={validPlayerHand} revealed />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
