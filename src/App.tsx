import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { GameTable3D } from './components/GameTable3D'
import { PlayerCard } from './components/PlayerCard'
import { GameControls } from './components/GameControls'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { GameState, Player } from './lib/types'
import { 
  createDeck, 
  createPlayer, 
  calculateHandValue, 
  isBust, 
  isBlackjack,
  shouldDealerHit,
  determineWinner,
  calculatePayout,
  generateRoomId
} from './lib/gameLogic'
import { Users, SignOut } from '@phosphor-icons/react'
import { toast } from 'sonner'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameState, setGameState] = useKV<GameState | null>('blackjack-game', null)
  const [currentPlayerId, setCurrentPlayerId] = useKV<string>('current-player-id', '')
  const [showSetup, setShowSetup] = useState(true)
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2'])
  const [numPlayers, setNumPlayers] = useState('2')

  const startNewGame = () => {
    const playerCount = parseInt(numPlayers)
    const names = playerNames.slice(0, playerCount)
    
    const players: Player[] = names.map(name => createPlayer(name, 500))
    
    const newGame: GameState = {
      roomId: generateRoomId(),
      players,
      deck: createDeck(),
      currentPlayerIndex: 0,
      phase: 'betting',
      dealerHand: [],
      dealerRevealed: false,
      roundNumber: 1,
      maxPlayers: playerCount,
      isOnline: false,
      startingChips: 500,
      minBet: 10
    }
    
    setGameState(newGame)
    setCurrentPlayerId(players[0].id)
    setGameStarted(true)
    setShowSetup(false)
    toast.success('Game started! Place your bets.')
  }

  const handleBet = (amount: number) => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null
      
      const updatedPlayers = current.players.map(p => {
        if (p.id === currentPlayerId && p.currentBet === 0) {
          return {
            ...p,
            currentBet: Math.min(amount, p.chips),
            chips: p.chips - Math.min(amount, p.chips)
          }
        }
        return p
      })

      const allBetsPlaced = updatedPlayers.every(p => p.currentBet > 0)
      
      if (allBetsPlaced) {
        setTimeout(() => dealInitialCards(), 500)
        return { ...current, players: updatedPlayers, phase: 'dealing' as const }
      }

      const nextPlayerIndex = updatedPlayers.findIndex((p, idx) => 
        idx > current.currentPlayerIndex && p.currentBet === 0
      )

      if (nextPlayerIndex !== -1) {
        setCurrentPlayerId(updatedPlayers[nextPlayerIndex].id)
      }

      return { ...current, players: updatedPlayers, currentPlayerIndex: nextPlayerIndex !== -1 ? nextPlayerIndex : current.currentPlayerIndex }
    })
  }

  const dealInitialCards = () => {
    setGameState((current) => {
      if (!current || current.phase !== 'dealing') return null

      let deck = [...current.deck]
      const updatedPlayers = current.players.map(p => {
        const card1 = deck.pop()!
        const card2 = deck.pop()!
        return {
          ...p,
          hand: [card1, card2],
          status: isBlackjack([card1, card2]) ? ('blackjack' as const) : ('playing' as const)
        }
      })

      const dealerCard1 = deck.pop()!
      const dealerCard2 = deck.pop()!
      const dealerHand = [dealerCard1, dealerCard2]

      setCurrentPlayerId(updatedPlayers[0].id)

      return {
        ...current,
        players: updatedPlayers,
        deck,
        dealerHand,
        phase: 'playing' as const,
        currentPlayerIndex: 0
      }
    })
  }

  const handleHit = () => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null

      let deck = [...current.deck]
      const newCard = deck.pop()!
      
      const updatedPlayers = current.players.map(p => {
        if (p.id === currentPlayerId) {
          const newHand = [...p.hand, newCard]
          const bust = isBust(newHand)
          
          return {
            ...p,
            hand: newHand,
            status: bust ? ('bust' as const) : p.status
          }
        }
        return p
      })

      const currentPlayer = updatedPlayers.find(p => p.id === currentPlayerId)
      if (currentPlayer?.status === 'bust') {
        toast.error(`${currentPlayer.name} busted!`)
        setTimeout(() => moveToNextPlayer(), 1000)
      }

      return { ...current, players: updatedPlayers, deck }
    })
  }

  const handleStand = () => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null

      const updatedPlayers = current.players.map(p => {
        if (p.id === currentPlayerId) {
          return { ...p, status: 'standing' as const }
        }
        return p
      })

      return { ...current, players: updatedPlayers }
    })

    setTimeout(() => moveToNextPlayer(), 500)
  }

  const moveToNextPlayer = () => {
    if (!gameState) return

    const nextPlayerIndex = gameState.players.findIndex((p, idx) => 
      idx > gameState.currentPlayerIndex && 
      (p.status === 'playing' || p.status === 'waiting')
    )

    if (nextPlayerIndex === -1) {
      setTimeout(() => playDealerTurn(), 500)
      setGameState((current) => current ? { ...current, phase: 'dealer-turn' as const } : null)
    } else {
      setCurrentPlayerId(gameState.players[nextPlayerIndex].id)
      setGameState((current) => current ? { ...current, currentPlayerIndex: nextPlayerIndex } : null)
    }
  }

  const playDealerTurn = () => {
    setGameState((current) => {
      if (!current) return null
      
      return { ...current, dealerRevealed: true }
    })

    setTimeout(() => {
      setGameState((current) => {
        if (!current) return null

        let deck = [...current.deck]
        let dealerHand = [...current.dealerHand]

        while (shouldDealerHit(dealerHand) && deck.length > 0) {
          const newCard = deck.pop()!
          dealerHand.push(newCard)
        }

        return { ...current, dealerHand, deck }
      })

      setTimeout(() => determineResults(), 1500)
    }, 1000)
  }

  const determineResults = () => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null

      const updatedPlayers = current.players.map(p => {
        if (p.status === 'bust') {
          return { ...p, status: 'lost' as const }
        }

        const result = determineWinner(p.hand, current.dealerHand)
        const payout = calculatePayout(p.currentBet, result, isBlackjack(p.hand))
        
        let status: Player['status']
        if (result === 'win') status = isBlackjack(p.hand) ? 'blackjack' : 'won'
        else if (result === 'lose') status = 'lost'
        else status = 'push'

        return {
          ...p,
          chips: p.chips + payout,
          status
        }
      })

      return { ...current, players: updatedPlayers, phase: 'results' as const }
    })

    toast.success('Round complete!')
  }

  const handleNextRound = () => {
    if (!gameState) return

    const activePlayers = gameState.players.filter(p => p.chips >= gameState.minBet)
    
    if (activePlayers.length === 0) {
      toast.error('Game Over! No players have enough chips.')
      setGameState((current) => current ? { ...current, phase: 'game-over' as const } : null)
      return
    }

    setGameState((current) => {
      if (!current) return null

      const updatedPlayers = current.players.map(p => ({
        ...p,
        hand: [],
        currentBet: 0,
        status: (p.chips >= current.minBet ? 'waiting' : 'lost') as Player['status']
      }))

      const newDeck = current.deck.length < 20 ? createDeck() : current.deck

      return {
        ...current,
        players: updatedPlayers,
        deck: newDeck,
        dealerHand: [],
        dealerRevealed: false,
        phase: 'betting' as const,
        currentPlayerIndex: 0,
        roundNumber: current.roundNumber + 1
      }
    })

    setCurrentPlayerId(activePlayers[0].id)
    toast.info('New round! Place your bets.')
  }

  const handleLeaveGame = () => {
    setGameState(null)
    setGameStarted(false)
    setShowSetup(true)
    setCurrentPlayerId('')
    toast.info('Left the game')
  }

  const updatePlayerName = (index: number, name: string) => {
    setPlayerNames(prev => {
      const newNames = [...prev]
      newNames[index] = name || `Player ${index + 1}`
      return newNames
    })
  }

  const handleNumPlayersChange = (value: string) => {
    setNumPlayers(value)
    const count = parseInt(value)
    setPlayerNames(prev => {
      const newNames = [...prev]
      while (newNames.length < count) {
        newNames.push(`Player ${newNames.length + 1}`)
      }
      return newNames.slice(0, count)
    })
  }

  if (showSetup || !gameStarted || !gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl p-8">
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Blackjack 3D
              </h1>
              <p className="text-muted-foreground text-lg">
                Experience casino blackjack with immersive 3D graphics
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="text-sm font-semibold mb-2 block">Number of Players</label>
                <Select value={numPlayers} onValueChange={handleNumPlayersChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Players</SelectItem>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Player Names</label>
                <div className="space-y-2">
                  {playerNames.map((name, index) => (
                    <Input
                      key={index}
                      value={name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      placeholder={`Player ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm space-y-1">
                <p><strong>Starting Chips:</strong> 500</p>
                <p><strong>Minimum Bet:</strong> 10</p>
                <p><strong>Game Mode:</strong> Local (Hot-seat)</p>
              </div>
            </div>

            <Button onClick={startNewGame} size="lg" className="w-full">
              <Users size={20} weight="bold" className="mr-2" />
              Start Game
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
  const isCurrentPlayer = !!currentPlayer

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Blackjack 3D
            </h1>
            <p className="text-sm text-muted-foreground">
              Round {gameState.roundNumber} • Room {gameState.roomId}
            </p>
          </div>
          <Button variant="outline" onClick={handleLeaveGame}>
            <SignOut size={18} weight="bold" className="mr-2" />
            Leave Game
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ height: '500px' }}>
              <GameTable3D
                players={gameState.players}
                dealerHand={gameState.dealerHand}
                dealerRevealed={gameState.dealerRevealed}
                currentPlayerId={currentPlayerId}
              />
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Dealer</h3>
                <Badge variant="secondary">
                  {gameState.dealerRevealed && `Hand: ${calculateHandValue(gameState.dealerHand)}`}
                  {!gameState.dealerRevealed && 'Hidden'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {gameState.dealerHand.length} cards
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isCurrentPlayer && currentPlayer && (
              <GameControls
                onHit={handleHit}
                onStand={handleStand}
                onBet={handleBet}
                onNextRound={handleNextRound}
                phase={gameState.phase}
                isActivePlayer={gameState.phase === 'playing' && gameState.players[gameState.currentPlayerIndex]?.id === currentPlayerId}
                currentBet={currentPlayer.currentBet}
                availableChips={currentPlayer.chips}
                minBet={gameState.minBet}
              />
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Players</h3>
              {gameState.players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isActive={player.id === currentPlayerId}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={gameState.phase === 'game-over'}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Over</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>All players are out of chips!</p>
            <Button onClick={handleLeaveGame} className="w-full">
              Return to Menu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
