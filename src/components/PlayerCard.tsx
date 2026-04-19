import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Player } from '@/lib/types'
import { calculateHandValue } from '@/lib/gameLogic'
import { CurrencyDollar, Crown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  player: Player
  isActive: boolean
  isDealer?: boolean
}

export function PlayerCard({ player, isActive, isDealer }: PlayerCardProps) {
  const handValue = Array.isArray(player.hand) && player.hand.length > 0 ? calculateHandValue(player.hand) : null

  const getStatusColor = () => {
    switch (player.status) {
      case 'won':
        return 'bg-gold text-gold-foreground'
      case 'lost':
        return 'bg-destructive text-destructive-foreground'
      case 'blackjack':
        return 'bg-gold text-gold-foreground'
      case 'bust':
        return 'bg-destructive text-destructive-foreground'
      case 'push':
        return 'bg-secondary text-secondary-foreground'
      case 'standing':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-primary text-primary-foreground'
    }
  }

  const getStatusLabel = () => {
    switch (player.status) {
      case 'won':
        return 'Winner'
      case 'lost':
        return 'Lost'
      case 'blackjack':
        return 'Blackjack!'
      case 'bust':
        return 'Bust'
      case 'push':
        return 'Push'
      case 'standing':
        return 'Standing'
      case 'playing':
        return 'Playing'
      default:
        return 'Waiting'
    }
  }

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-300',
        isActive && 'ring-2 ring-gold',
        player.status === 'won' && 'ring-2 ring-gold',
        player.status === 'lost' && 'opacity-60'
      )}
      style={isActive ? {
        boxShadow: '0 10px 15px -3px rgba(218, 165, 32, 0.3), 0 4px 6px -4px rgba(218, 165, 32, 0.3), 0 0 20px rgba(218, 165, 32, 0.4)'
      } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isDealer && <Crown className="text-gold" size={20} weight="fill" />}
          <h3 className="font-semibold text-lg">{player.name}</h3>
        </div>
        <Badge className={getStatusColor()}>
          {getStatusLabel()}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <CurrencyDollar size={16} className="text-gold" weight="bold" />
          <span className="font-mono font-bold">{player.chips}</span>
          <span className="text-muted-foreground">chips</span>
        </div>

        {player.currentBet > 0 && (
          <div className="text-sm text-muted-foreground">
            Bet: <span className="font-mono font-semibold text-foreground">{player.currentBet}</span>
          </div>
        )}

        {handValue !== null && (
          <div className="text-sm">
            Hand value: <span className="font-mono font-bold text-lg">{handValue}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
