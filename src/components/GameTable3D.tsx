import { Player, Card } from '@/lib/types'
import { getCardSymbol, getCardColor } from '@/lib/gameLogic'
import { Badge } from './ui/badge'

interface GameTable3DProps {
  players: Player[]
  dealerHand: Card[]
  dealerRevealed: boolean
  currentPlayerId?: string
}

function PlayingCard({ card, faceUp }: { card: Card; faceUp: boolean }) {
  if (!faceUp) {
    return (
      <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 border-2 border-gold flex items-center justify-center shadow-lg">
        <div className="text-gold text-xl font-bold">♠♥♣♦</div>
      </div>
    )
  }

  const symbol = getCardSymbol(card.suit)
  const color = getCardColor(card.suit)

  return (
    <div className="w-16 h-24 rounded-lg bg-white border-2 border-gray-300 shadow-lg flex flex-col p-2">
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
    </div>
  )
}

export function GameTable3D({ players, dealerHand, dealerRevealed, currentPlayerId }: GameTable3DProps) {
  const isValidCard = (card: any): card is Card => {
    return !!(card && typeof card === 'object' && card.id && card.suit && card.rank)
  }

  const validDealerHand = Array.isArray(dealerHand) ? dealerHand.filter(isValidCard) : []

  return (
    <div className="w-full h-full bg-gradient-to-br from-green-800 via-green-900 to-green-950 rounded-lg p-8 flex flex-col items-center justify-between relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-radial-gradient(circle at 0 0, transparent 0, rgba(255,255,255,0.1) 10px, transparent 20px)`
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">DEALER</Badge>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {validDealerHand.map((card, index) => (
            <PlayingCard
              key={`dealer-${card.id}-${index}`}
              card={card}
              faceUp={dealerRevealed || index === 0}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full flex justify-around items-center flex-wrap gap-4">
        {players.map((player) => {
          if (!player || !player.id) return null
          const isCurrentPlayer = player.id === currentPlayerId
          const validPlayerHand = player.hand.filter(isValidCard)

          return (
            <div
              key={`player-${player.id}`}
              className={`flex flex-col items-center gap-3 p-4 rounded-lg transition-all ${
                isCurrentPlayer
                  ? 'bg-gold/20 border-2 border-gold shadow-lg shadow-gold/50'
                  : 'bg-black/20 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Badge variant={isCurrentPlayer ? 'default' : 'outline'} className="text-xs">
                  {player.name}
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {validPlayerHand.map((card, cardIndex) => (
                  <PlayingCard
                    key={`player-${player.id}-${card.id}-${cardIndex}`}
                    card={card}
                    faceUp
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
