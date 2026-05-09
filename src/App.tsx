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
import { AppGameState, AppPlayer, GameState, Player, BetHistoryEntry } from './lib/types'
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

type InitialAppGameConfig = {
  roomId: string
  players: AppPlayer[]
  phase: AppGameState['phase']
  maxPlayers: number
  isOnline: boolean
  startingChips: number
  minBet: number
}

const createAppPlayer = (name: string, chips: number): AppPlayer => ({
  ...createPlayer(name, chips),
  hand: []
})

const createInitialAppGame = (config: InitialAppGameConfig): AppGameState => ({
  roomId: config.roomId,
  players: config.players,
  deck: createDeck(),
  currentPlayerIndex: 0,
  phase: config.phase,
  dealerHand: [],
  dealerRevealed: false,
  roundNumber: 1,
  maxPlayers: config.maxPlayers,
  isOnline: config.isOnline,
  startingChips: config.startingChips,
  minBet: config.minBet
})

const withLastUpdate = (state: AppGameState): AppGameState => ({
  ...state,
  lastUpdate: Date.now()
})

const canJoinRound = (player: AppPlayer) => player.status !== 'lost'
const isPlayablePlayer = (player: AppPlayer) => player.status === 'playing'
const hasPlacedBet = (player: AppPlayer) => player.currentBet > 0
const needsBet = (player: AppPlayer) => canJoinRound(player) && !hasPlacedBet(player)

const findNextIndex = (
  players: AppPlayer[],
  currentIndex: number,
  predicate: (player: AppPlayer) => boolean
) => players.findIndex((player, index) => index > currentIndex && predicate(player))

function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('setup')
  const [gameState, setGameState] = useKV<AppGameState | null>('blackjack-game', null)
  const [currentPlayerId, setCurrentPlayerId] = useKV<string>('current-player-id', '')
  const [, setBetHistory] = useKV<BetHistoryEntry[]>('bet-history', [])
  const [roomName, setRoomName] = useState('')
  const [isHost, setIsHost] = useState(false)
  
  const isOnlineMode = gameState?.isOnline || false
  
  const { publishState } = useGameSync({
    roomId: gameState?.roomId || '',
    playerId: currentPlayerId || '',
    onStateUpdate: (newState) => {
      const appState = newState as unknown as AppGameState
      if (isOnlineMode && gameState?.roomId === appState.roomId) {
        setGameState(appState)
      }
    },
    enabled: isOnlineMode
  })

  const publishAppState = useCallback((state: AppGameState) => {
    return publishState(state as unknown as GameState)
  }, [publishState])

  const startLocalGame = useCallback((config: {
    numPlayers: number
    playerNames: string[]
    startingChips: number
    minBet: number
  }) => {
    const players = config.playerNames.map(name =>
      createAppPlayer(name, config.startingChips)
    )
    
    const newGame = createInitialAppGame({
      roomId: generateRoomId(),
      players,
      phase: 'betting',
      maxPlayers: config.numPlayers,
      isOnline: false,
      startingChips: config.startingChips,
      minBet: config.minBet
    })
    
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
    
    const player = createAppPlayer(playerName, config.startingChips)
    player.id = playerId
    
    const newGame = createInitialAppGame({
      roomId,
      players: [player],
      phase: 'lobby',
      maxPlayers: config.maxPlayers,
      isOnline: true,
      startingChips: config.startingChips,
      minBet: config.minBet
    })
    
    await spark.kv.set(`game-room-${roomId}`, withLastUpdate(newGame))
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
      const existingGame = await spark.kv.get<AppGameState>(`game-room-${roomId}`)
      
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
      const newPlayer = createAppPlayer(playerName, existingGame.startingChips)
      newPlayer.id = playerId
      
      const updatedGame: AppGameState = {
        ...existingGame,
        players: [...existingGame.players, newPlayer]
      }
      
      await spark.kv.set(`game-room-${roomId}`, withLastUpdate(updatedGame))
      
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
    
    const updatedGame: AppGameState = {
      ...gameState,
      phase: 'betting',
      currentPlayerIndex: 0
    }
    
    setGameState(updatedGame)
    await publishAppState(updatedGame)
    setAppPhase('game')
    toast.success('Game started! Place your bets.')
  }, [gameState, isHost, setGameState, publishAppState])

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
      if (current.phase !== 'betting') return current

      const activePlayer = current.players[current.currentPlayerIndex]
      if (!activePlayer || activePlayer.id !== currentPlayerId || !needsBet(activePlayer)) {
        return current
      }
      
      const updatedPlayers = current.players.map(p => {
        if (p.id === currentPlayerId && p.currentBet === 0) {
          const bet = Math.min(amount, p.chips)
          return {
            ...p,
            currentBet: bet,
            chips: p.chips - bet
          }
        }
        return p
      })

      const activeRoundPlayers = updatedPlayers.filter(canJoinRound)
      const allBetsPlaced = activeRoundPlayers.length > 0 && activeRoundPlayers.every(hasPlacedBet)
      const nextPlayerIndex = findNextIndex(updatedPlayers, current.currentPlayerIndex, needsBet)
      
      const newState = { 
        ...current, 
        players: updatedPlayers, 
        currentPlayerIndex: allBetsPlaced || nextPlayerIndex === -1 ? current.currentPlayerIndex : nextPlayerIndex,
        phase: allBetsPlaced ? ('dealing' as const) : current.phase
      }
      
      if (current.isOnline) {
        publishAppState(newState)
      }
      
      if (!allBetsPlaced && nextPlayerIndex !== -1) {
        if (!current.isOnline) {
          setCurrentPlayerId(updatedPlayers[nextPlayerIndex].id)
        }
      }

      return newState
    })
  }, [gameState, currentPlayerId, setGameState, publishAppState, setCurrentPlayerId])

  const dealInitialCards = useCallback(() => {
    setGameState((current) => {
      if (!current || current.phase !== 'dealing') return current || null

      let deck = [...current.deck]
      const playersInRound = current.players.filter(hasPlacedBet)
      const cardsNeeded = (playersInRound.length * 2) + 2
      if (deck.length < cardsNeeded) {
        deck = createDeck()
      }

      const updatedPlayers = current.players.map(p => {
        if (!hasPlacedBet(p)) {
          return {
            ...p,
            hand: []
          }
        }

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

      const firstPlayableIndex = updatedPlayers.findIndex(isPlayablePlayer)
      const nextPlayerIndex = firstPlayableIndex === -1 ? 0 : firstPlayableIndex
      if (!current.isOnline) {
        setCurrentPlayerId(updatedPlayers[nextPlayerIndex]?.id || '')
      }

      const newState = {
        ...current,
        players: updatedPlayers,
        deck,
        dealerHand,
        phase: firstPlayableIndex === -1 ? ('dealer-turn' as const) : ('playing' as const),
        currentPlayerIndex: nextPlayerIndex
      }
      
      if (current.isOnline) {
        publishAppState(newState)
      }

      return newState
    })
  }, [setGameState, publishAppState, setCurrentPlayerId])

  useEffect(() => {
    if (gameState?.phase !== 'dealing') return

    const timer = window.setTimeout(() => dealInitialCards(), 500)
    return () => window.clearTimeout(timer)
  }, [gameState?.phase, dealInitialCards])

  const handleHit = useCallback(() => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null
      if (current.phase !== 'playing') return current

      const activePlayer = current.players[current.currentPlayerIndex]
      if (!activePlayer || activePlayer.id !== currentPlayerId || !isPlayablePlayer(activePlayer)) {
        return current
      }

      let deck = [...current.deck]
      if (deck.length === 0) {
        deck = createDeck()
      }

      const newCard = deck.pop()
      if (!newCard) return current
      
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
      }

      const newState = { ...current, players: updatedPlayers, deck }
      
      if (current.isOnline) {
        publishAppState(newState)
      }

      return newState
    })
  }, [gameState, currentPlayerId, setGameState, publishAppState])

  const handleStand = useCallback(() => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null
      if (current.phase !== 'playing') return current

      const activePlayer = current.players[current.currentPlayerIndex]
      if (!activePlayer || activePlayer.id !== currentPlayerId || !isPlayablePlayer(activePlayer)) {
        return current
      }

      const updatedPlayers = current.players.map(p => {
        if (p.id === currentPlayerId) {
          return { ...p, status: 'standing' as const }
        }
        return p
      })

      const newState = { ...current, players: updatedPlayers }
      
      if (current.isOnline) {
        publishAppState(newState)
      }

      return newState
    })

  }, [gameState, currentPlayerId, setGameState, publishAppState])

  const determineResults = useCallback(() => {
    if (!gameState) return

    setGameState((current) => {
      if (!current) return null

      const updatedPlayers = current.players.map(p => {
        if (!hasPlacedBet(p)) {
          return p
        }

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
        publishAppState(newState)
      }

      const newEntries: BetHistoryEntry[] = current.players.filter(hasPlacedBet).map(p => {
        const isBustStatus = p.status === 'bust'
        const result = isBustStatus ? 'lose' : determineWinner(p.hand, current.dealerHand)
        const payout = calculatePayout(p.currentBet, result, isBlackjack(p.hand))
        const profit = payout - p.currentBet
        
        let betResult: 'won' | 'lost' | 'push' | 'blackjack'
        if (isBustStatus) betResult = 'lost'
        else if (result === 'win') betResult = isBlackjack(p.hand) ? 'blackjack' : 'won'
        else if (result === 'lose') betResult = 'lost'
        else betResult = 'push'

        return {
          id: `${current.roomId}-${current.roundNumber}-${p.id}`,
          playerId: p.id,
          playerName: p.name,
          roomId: current.roomId,
          roundNumber: current.roundNumber,
          betAmount: p.currentBet,
          result: betResult,
          payout,
          profit,
          playerHandValue: calculateHandValue(p.hand),
          dealerHandValue: calculateHandValue(current.dealerHand),
          timestamp: Date.now(),
          isBlackjack: isBlackjack(p.hand)
        }
      })

      if (newEntries.length > 0) {
        setBetHistory((history) => [...(history || []), ...newEntries])
      }

      return newState
    })

    toast.success('Round complete!')
  }, [gameState, setGameState, publishAppState, setBetHistory])

  const moveToNextPlayer = useCallback(() => {
    setGameState((current) => {
      if (!current || current.phase !== 'playing') return current || null

      const nextPlayerIndex = findNextIndex(current.players, current.currentPlayerIndex, isPlayablePlayer)

      if (nextPlayerIndex === -1) {
        const newState = { ...current, phase: 'dealer-turn' as const }
        if (current.isOnline) publishAppState(newState)
        return newState
      }

      if (!current.isOnline) {
        setCurrentPlayerId(current.players[nextPlayerIndex].id)
      }
      const newState = { ...current, currentPlayerIndex: nextPlayerIndex }
      if (current.isOnline) publishAppState(newState)
      return newState
    })
  }, [setGameState, publishAppState, setCurrentPlayerId])

  useEffect(() => {
    if (gameState?.phase !== 'playing') return

    const activePlayer = gameState.players[gameState.currentPlayerIndex]
    if (!activePlayer || isPlayablePlayer(activePlayer)) return

    const delay = activePlayer.status === 'bust' ? 1000 : 500
    const timer = window.setTimeout(() => moveToNextPlayer(), delay)
    return () => window.clearTimeout(timer)
  }, [gameState?.phase, gameState?.players, gameState?.currentPlayerIndex, moveToNextPlayer])

  const playDealerTurn = useCallback(() => {
    setGameState((current) => {
      if (!current) return null
      const newState = { ...current, dealerRevealed: true }
      if (current.isOnline) publishAppState(newState)
      return newState
    })

    setTimeout(() => {
      setGameState((current) => {
        if (!current) return null

        const deck = [...current.deck]
        const dealerHand = [...current.dealerHand]

        while (shouldDealerHit(dealerHand) && deck.length > 0) {
          const newCard = deck.pop()!
          dealerHand.push(newCard)
        }

        const newState = { ...current, dealerHand, deck }
        if (current.isOnline) publishAppState(newState)
        return newState
      })

      setTimeout(() => determineResults(), 1500)
    }, 1000)
  }, [setGameState, publishAppState, determineResults])

  useEffect(() => {
    if (gameState?.phase !== 'dealer-turn' || gameState.dealerRevealed) return

    const timer = window.setTimeout(() => playDealerTurn(), 500)
    return () => window.clearTimeout(timer)
  }, [gameState?.phase, gameState?.dealerRevealed, playDealerTurn])

  const handleNextRound = useCallback(() => {
    if (!gameState) return

    const activePlayers = gameState.players.filter(p => p.chips >= gameState.minBet)
    
    if (activePlayers.length === 0) {
      toast.error('Game Over! No players have enough chips.')
      setGameState((current) => {
        if (!current) return null
        const newState = { ...current, phase: 'game-over' as const }
        if (current.isOnline) publishAppState(newState)
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
      const firstActiveIndex = updatedPlayers.findIndex(canJoinRound)
      const nextPlayerIndex = firstActiveIndex === -1 ? 0 : firstActiveIndex

      const newState = {
        ...current,
        players: updatedPlayers,
        deck: newDeck,
        dealerHand: [],
        dealerRevealed: false,
        phase: 'betting' as const,
        currentPlayerIndex: nextPlayerIndex,
        roundNumber: current.roundNumber + 1
      }
      
      if (current.isOnline) {
        publishAppState(newState)
      }

      if (!current.isOnline) {
        setCurrentPlayerId(updatedPlayers[nextPlayerIndex]?.id || '')
      }
      return newState
    })

    toast.info('New round! Place your bets.')
  }, [gameState, setGameState, publishAppState, setCurrentPlayerId])

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

      <div className="flex flex-col h-[calc(100vh-73px)]">
        <div className="flex-1 p-6">
          <div className="bg-card rounded-lg border border-border overflow-hidden h-full">
            <GameTable3D
              players={gameState.players}
              dealerHand={gameState.dealerHand}
              dealerRevealed={gameState.dealerRevealed}
              currentPlayerId={currentPlayerId}
            />
          </div>
        </div>

        <div className="border-t border-border bg-card">
          <div className="container mx-auto p-4">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {gameState.players.map((player) => (
                    <div key={player.id} className="flex-shrink-0" style={{ width: '280px' }}>
                      <PlayerCard
                        player={player}
                        isActive={player.id === currentPlayerId}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-shrink-0" style={{ width: '320px' }}>
                {currentPlayer && (
                  <GameControls
                    onBet={handleBet}
                    onHit={handleHit}
                    onStand={handleStand}
                    onNextRound={handleNextRound}
                    phase={gameState.phase}
                    isActivePlayer={isActivePlayer}
                    currentBet={currentPlayer.currentBet}
                    availableChips={currentPlayer.chips}
                    minBet={gameState.minBet}
                  />
                )}
              </div>
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
