import { useState, useCallback, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { GameTable3D } from './components/GameTable3D'
import { PlayerCard } from './components/PlayerCard'
import { GameControls } from './components/GameControls'
import { GameSetup } from './components/GameSetup'
import { LobbyWaiting } from './components/LobbyWaiting'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog'
import { GameState, Player, BetHistoryEntry } from './lib/types'
import { 
  createDeck, 
  createPlayer, 
  calculateHandValue, 
  isBust, 
  isBlackjack,
  shouldDealerHit,
  determineWinner,
  calculatePayout,
  generateRoomId,
  generatePlayerId
} from './lib/gameLogic'
import { SignOut, WifiHigh, ChartLine } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useGameSync } from './hooks/useGameSync'

type AppPhase = 'setup' | 'lobby' | 'game' | 'analytics'

function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('setup')
  const [gameState, setGameState] = useKV<GameState | null>('blackjack-game', null)
  const [currentPlayerId, setCurrentPlayerId] = useKV<string>('current-player-id', '')
  const [betHistory, setBetHistory] = useKV<BetHistoryEntry[]>('bet-history', [])
  const [roomName, setRoomName] = useState('')
  const [isHost, setIsHost] = useState(false)
  
  const isOnlineMode = gameState?.isOnline || false
  
  const { publishState } = useGameSync({
    roomId: gameState?.roomId || '',
    playerId: currentPlayerId || '',
    onStateUpdate: (newState) => {
      if (isOnlineMode && gameState?.roomId === newState.roomId) {
        setGameState(newState)
      }
    },
    enabled: isOnlineMode
  })

  const startLocalGame = useCallback((config: {
    numPlayers: number
    playerNames: string[]
    startingChips: number
    minBet: number
  }) => {
    const players: Player[] = config.playerNames.map(name => 
      createPlayer(name, config.startingChips)
    )
    
    const newGame: GameState = {
      roomId: generateRoomId(),
      players,
      deck: createDeck(),
      currentPlayerIndex: 0,
      phase: 'betting',
      dealerHand: [],
      dealerRevealed: false,
      roundNumber: 1,
      maxPlayers: config.numPlayers,
      isOnline: false,
      startingChips: config.startingChips,
      minBet: config.minBet
    }
    
    setGameState(newGame)
    setCurrentPlayerId(players[0].id)
    setAppPhase('game')
    toast.success('Local game started! Place your bets.')
  }, [setGameState, setCurrentPlayerId])

  const createOnlineRoom = useCallback(async (config: {
    roomName: string
    maxPlayers: number
    startingChips: number
    minBet: number
  }) => {
    const roomId = generateRoomId()
    const playerId = generatePlayerId()
    const user = await spark.user()
    const playerName = user.login || 'Host'
    
    const player = createPlayer(playerName, config.startingChips)
    player.id = playerId
    
    const newGame: GameState = {
      roomId,
      players: [player],
      deck: createDeck(),
      currentPlayerIndex: 0,
      phase: 'lobby',
      dealerHand: [],
      dealerRevealed: false,
      roundNumber: 1,
      maxPlayers: config.maxPlayers,
      isOnline: true,
      startingChips: config.startingChips,
      minBet: config.minBet
    }
    
    await spark.kv.set(`game-room-${roomId}`, newGame)
    await spark.kv.set(`room-meta-${roomId}`, {
      roomName: config.roomName,
      createdAt: Date.now()
    })
    
    setGameState(newGame)
    setCurrentPlayerId(playerId)
    setRoomName(config.roomName)
    setIsHost(true)
    setAppPhase('lobby')
    toast.success(`Room created! Code: ${roomId}`)
  }, [setGameState, setCurrentPlayerId])

  const joinOnlineRoom = useCallback(async (roomId: string, playerName: string) => {
    try {
      const existingGame = await spark.kv.get<GameState>(`game-room-${roomId}`)
      
      if (!existingGame) {
        toast.error('Room not found')
        return
      }
      
      if (existingGame.phase !== 'lobby') {
        toast.error('Game already in progress')
        return
      }
      
      if (existingGame.players.length >= existingGame.maxPlayers) {
        toast.error('Room is full')
        return
      }
      
      const playerId = generatePlayerId()
      const newPlayer = createPlayer(playerName, existingGame.startingChips)
      newPlayer.id = playerId
      
      const updatedGame: GameState = {
        ...existingGame,
        players: [...existingGame.players, newPlayer]
      }
      
      await spark.kv.set(`game-room-${roomId}`, updatedGame)
      
      const roomMeta = await spark.kv.get<{ roomName: string }>(`room-meta-${roomId}`)
      
      setGameState(updatedGame)
      setCurrentPlayerId(playerId)
      setRoomName(roomMeta?.roomName || 'Game Room')
      setIsHost(false)
      setAppPhase('lobby')
      toast.success('Joined room successfully!')
    } catch (error) {
      toast.error('Failed to join room')
      console.error(error)
    }
  }, [setGameState, setCurrentPlayerId])

  const startOnlineGame = useCallback(async () => {
    if (!gameState || !isHost) return
    
    const updatedGame: GameState = {
      ...gameState,
      phase: 'betting',
      currentPlayerIndex: 0
    }
    
    setGameState(updatedGame)
    await publishState(updatedGame)
    setAppPhase('game')
    toast.success('Game started! Place your bets.')
  }, [gameState, isHost, setGameState, publishState])

  const leaveGame = useCallback(async () => {
    if (gameState?.isOnline && gameState.roomId) {
      await spark.kv.delete(`player-status-${gameState.roomId}-${currentPlayerId}`)
      
      if (isHost) {
        await spark.kv.delete(`game-room-${gameState.roomId}`)
        await spark.kv.delete(`room-meta-${gameState.roomId}`)
      }
    }
    
    setGameState(null)
    setCurrentPlayerId('')
    setAppPhase('setup')
    setIsHost(false)
    setRoomName('')
    toast.info('Left the game')
  }, [gameState, currentPlayerId, isHost, setGameState, setCurrentPlayerId])

  const handleBet = useCallback((amount: number) => {
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
      
      const newState = { 
        ...current, 
        players: updatedPlayers, 
        phase: allBetsPlaced ? ('dealing' as const) : current.phase
      }
      
      if (current.isOnline) {
        publishState(newState)
      }
      
      if (allBetsPlaced) {
        setTimeout(() => dealInitialCards(), 500)
      } else {
        const nextPlayerIndex = updatedPlayers.findIndex((p, idx) => 
          idx > current.currentPlayerIndex && p.currentBet === 0
        )
        if (nextPlayerIndex !== -1) {
          setCurrentPlayerId(updatedPlayers[nextPlayerIndex].id)
        }
      }

      return newState
    })
  }, [gameState, currentPlayerId, setGameState, publishState, setCurrentPlayerId])

  const dealInitialCards = useCallback(() => {
    setGameState((current) => {
      if (!current || current.phase !== 'dealing') return current || null

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

      const newState = {
        ...current,
        players: updatedPlayers,
        deck,
        dealerHand,
        phase: 'playing' as const,
        currentPlayerIndex: 0
      }
      
      if (current.isOnline) {
        publishState(newState)
      }

      return newState
    })
  }, [setGameState, publishState, setCurrentPlayerId])

  const handleHit = useCallback(() => {
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

      const newState = { ...current, players: updatedPlayers, deck }
      
      if (current.isOnline) {
        publishState(newState)
      }

      return newState
    })
  }, [gameState, currentPlayerId, setGameState, publishState])

  const handleStand = useCallback(() => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null

      const updatedPlayers = current.players.map(p => {
        if (p.id === currentPlayerId) {
          return { ...p, status: 'standing' as const }
        }
        return p
      })

      const newState = { ...current, players: updatedPlayers }
      
      if (current.isOnline) {
        publishState(newState)
      }

      return newState
    })

    setTimeout(() => moveToNextPlayer(), 500)
  }, [gameState, currentPlayerId, setGameState, publishState])

  const moveToNextPlayer = useCallback(() => {
    if (!gameState) return

    const nextPlayerIndex = gameState.players.findIndex((p, idx) => 
      idx > gameState.currentPlayerIndex && 
      (p.status === 'playing' || p.status === 'waiting')
    )

    if (nextPlayerIndex === -1) {
      setTimeout(() => playDealerTurn(), 500)
      setGameState((current) => {
        if (!current) return null
        const newState = { ...current, phase: 'dealer-turn' as const }
        if (current.isOnline) publishState(newState)
        return newState
      })
    } else {
      setCurrentPlayerId(gameState.players[nextPlayerIndex].id)
      setGameState((current) => {
        if (!current) return null
        const newState = { ...current, currentPlayerIndex: nextPlayerIndex }
        if (current.isOnline) publishState(newState)
        return newState
      })
    }
  }, [gameState, setGameState, publishState, setCurrentPlayerId])

  const playDealerTurn = useCallback(() => {
    setGameState((current) => {
      if (!current) return null
      const newState = { ...current, dealerRevealed: true }
      if (current.isOnline) publishState(newState)
      return newState
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

        const newState = { ...current, dealerHand, deck }
        if (current.isOnline) publishState(newState)
        return newState
      })

      setTimeout(() => determineResults(), 1500)
    }, 1000)
  }, [setGameState, publishState])

  const determineResults = useCallback(() => {
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

      const newState = { ...current, players: updatedPlayers, phase: 'results' as const }
      
      if (current.isOnline) {
        publishState(newState)
      }

      return newState
    })

    if (gameState) {
      const newEntries: BetHistoryEntry[] = gameState.players.map(p => {
        const isBustStatus = p.status === 'bust'
        const result = isBustStatus ? 'lose' : determineWinner(p.hand, gameState.dealerHand)
        const payout = calculatePayout(p.currentBet, result, isBlackjack(p.hand))
        const profit = payout - p.currentBet
        
        let betResult: 'won' | 'lost' | 'push' | 'blackjack'
        if (isBustStatus) betResult = 'lost'
        else if (result === 'win') betResult = isBlackjack(p.hand) ? 'blackjack' : 'won'
        else if (result === 'lose') betResult = 'lost'
        else betResult = 'push'

        return {
          id: `${gameState.roomId}-${gameState.roundNumber}-${p.id}`,
          playerId: p.id,
          playerName: p.name,
          roomId: gameState.roomId,
          roundNumber: gameState.roundNumber,
          betAmount: p.currentBet,
          result: betResult,
          payout,
          profit,
          playerHandValue: calculateHandValue(p.hand),
          dealerHandValue: calculateHandValue(gameState.dealerHand),
          timestamp: Date.now(),
          isBlackjack: isBlackjack(p.hand)
        }
      })

      setBetHistory((current) => [...(current || []), ...newEntries])
    }

    toast.success('Round complete!')
  }, [gameState, setGameState, publishState, setBetHistory])

  const handleNextRound = useCallback(() => {
    if (!gameState) return

    const activePlayers = gameState.players.filter(p => p.chips >= gameState.minBet)
    
    if (activePlayers.length === 0) {
      toast.error('Game Over! No players have enough chips.')
      setGameState((current) => {
        if (!current) return null
        const newState = { ...current, phase: 'game-over' as const }
        if (current.isOnline) publishState(newState)
        return newState
      })
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

      const newState = {
        ...current,
        players: updatedPlayers,
        deck: newDeck,
        dealerHand: [],
        dealerRevealed: false,
        phase: 'betting' as const,
        currentPlayerIndex: 0,
        roundNumber: current.roundNumber + 1
      }
      
      if (current.isOnline) {
        publishState(newState)
      }

      return newState
    })

    setCurrentPlayerId(activePlayers[0].id)
    toast.info('New round! Place your bets.')
  }, [gameState, setGameState, publishState, setCurrentPlayerId])

  if (appPhase === 'setup') {
    return (
      <GameSetup
        onStartLocal={startLocalGame}
        onCreateOnline={createOnlineRoom}
        onJoinOnline={joinOnlineRoom}
      />
    )
  }

  if (appPhase === 'analytics') {
    return (
      <AnalyticsDashboard
        currentPlayerId={currentPlayerId || ''}
        onClose={() => setAppPhase('game')}
      />
    )
  }

  if (appPhase === 'lobby' && gameState) {
    return (
      <LobbyWaiting
        roomId={gameState.roomId}
        roomName={roomName}
        players={gameState.players}
        maxPlayers={gameState.maxPlayers}
        isHost={isHost}
        onStartGame={startOnlineGame}
        onLeave={leaveGame}
      />
    )
  }

  if (!gameState) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId)
  const isActivePlayer = gameState.players[gameState.currentPlayerIndex]?.id === currentPlayerId

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Blackjack 3D
              </h1>
              {gameState.isOnline && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <WifiHigh size={14} weight="bold" />
                  Online
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Round {gameState.roundNumber} • Room {gameState.roomId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setAppPhase('analytics')}>
              <ChartLine size={18} weight="bold" className="mr-2" />
              Analytics
            </Button>
            <Button variant="outline" onClick={leaveGame}>
              <SignOut size={18} weight="bold" className="mr-2" />
              Leave Game
            </Button>
          </div>
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
            {currentPlayer && (
              <GameControls
          <div className="space-y-4">
            {currentPlayer && (
              <GameControls
                onNextRound={handleNextRound}
                phase={gameState.phase}
                isActivePlayer={isActivePlayer}
                currentBet={currentPlayer.currentBet}
                availableChips={currentPlayer.chips}
                minBet={gameState.minBet}
              />
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Players</h3>
              {gameState.players.map((player) => (
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
            <Button onClick={leaveGame} className="w-full">
              Return to Menu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
