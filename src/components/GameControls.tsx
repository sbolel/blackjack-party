import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { ChipButton } from '@/components/ChipButton'
import { Cards, HandPalm, Plus, Minus } from '@phosphor-icons/react'
import { useState } from 'react'

interface GameControlsProps {
  onHit: () => void
  onStand: () => void
  onBet: (amount: number) => void
  onNextRound: () => void
  phase: 'betting' | 'playing' | 'results' | 'lobby' | 'dealing' | 'dealer-turn' | 'game-over'
  isActivePlayer: boolean
  currentBet: number
  availableChips: number
  minBet: number
}

export function GameControls({
  onHit,
  onStand,
  onBet,
  onNextRound,
  phase,
  isActivePlayer,
  currentBet,
  availableChips,
  minBet
}: GameControlsProps) {
  const [betAmount, setBetAmount] = useState(minBet)

  const handleBetChange = (value: number[]) => {
    setBetAmount(value[0])
  }

  const adjustBet = (delta: number) => {
    const newBet = Math.max(minBet, Math.min(availableChips, betAmount + delta))
    setBetAmount(newBet)
  }

  const confirmBet = () => {
    onBet(betAmount)
  }
  
  const quickBetAmounts = [minBet, minBet * 5, minBet * 10, minBet * 20]

  if (phase === 'betting') {
    return (
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Place Your Bet</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bet Amount</span>
            <span className="font-mono font-bold text-xl">{betAmount}</span>
          </div>
          
          <Slider
            value={[betAmount]}
            onValueChange={handleBetChange}
            min={minBet}
            max={availableChips}
            step={minBet}
            className="w-full"
          />
          
          <div className="flex gap-2 items-center justify-center pt-2">
            {quickBetAmounts.filter(amt => amt <= availableChips).map((amount) => (
              <ChipButton
                key={amount}
                value={amount}
                onClick={() => setBetAmount(amount)}
                color={betAmount === amount ? 'gold' : 'secondary'}
              />
            ))}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustBet(-minBet * 5)}
              disabled={betAmount <= minBet}
            >
              <Minus weight="bold" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustBet(minBet * 5)}
              disabled={betAmount >= availableChips}
            >
              <Plus weight="bold" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(minBet)}
              className="flex-1"
            >
              Min
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(Math.floor(availableChips / 2))}
              className="flex-1"
            >
              Half
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(availableChips)}
              className="flex-1"
            >
              Max
            </Button>
          </div>
        </div>

        <Button
          onClick={confirmBet}
          className="w-full"
          variant="default"
          size="lg"
          disabled={currentBet > 0}
        >
          {currentBet > 0 ? 'Bet Placed' : 'Confirm Bet'}
        </Button>
      </div>
    )
  }

  if (phase === 'playing' && isActivePlayer) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">Your Turn</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={onHit}
            variant="default"
            size="lg"
            className="h-20"
          >
            <Cards size={24} weight="bold" className="mr-2" />
            Hit
          </Button>
          <Button
            onClick={onStand}
            variant="secondary"
            size="lg"
            className="h-20"
          >
            <HandPalm size={24} weight="bold" className="mr-2" />
            Stand
          </Button>
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <Button
          onClick={onNextRound}
          variant="default"
          size="lg"
          className="w-full"
        >
          Next Round
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
      {phase === 'dealing' && 'Dealing cards...'}
      {phase === 'dealer-turn' && 'Dealer is playing...'}
      {phase === 'playing' && !isActivePlayer && 'Waiting for other players...'}
      {phase === 'lobby' && 'Waiting to start...'}
      {phase === 'game-over' && 'Game Over'}
    </div>
  )
}
