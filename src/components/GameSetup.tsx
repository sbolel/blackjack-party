import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Play, SignIn } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

interface GameSetupProps {
  onStartLocal: (config: {
    numPlayers: number
    playerNames: string[]
    startingChips: number
    minBet: number
  }) => void
  onCreateOnline: (config: {
    roomName: string
    maxPlayers: number
    startingChips: number
    minBet: number
  }) => void
  onJoinOnline: (roomId: string, playerName: string) => void
}

interface DiscoLight {
  x: number
  y: number
  color: string
  size: number
  angle: number
  speed: number
}

export function GameSetup({ onStartLocal, onCreateOnline, onJoinOnline }: GameSetupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lightsRef = useRef<DiscoLight[]>([])
  const animationRef = useRef<number>()
  
  const [gameMode, setGameMode] = useKV<'local' | 'online'>('setup-game-mode', 'local')
  
  const [numPlayers, setNumPlayers] = useKV<string>('setup-num-players', '2')
  const [playerNames, setPlayerNames] = useKV<string[]>('setup-player-names', ['Player 1', 'Player 2'])
  const [startingChips, setStartingChips] = useKV<string>('setup-starting-chips', '500')
  const [minBet, setMinBet] = useKV<string>('setup-min-bet', '10')
  
  const [roomName, setRoomName] = useKV<string>('setup-room-name', '')
  const [maxPlayers, setMaxPlayers] = useKV<string>('setup-max-players', '4')
  const [joinRoomId, setJoinRoomId] = useKV('setup-join-room-id', '')
  const [joinPlayerName, setJoinPlayerName] = useKV('setup-join-player-name', '')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const discoColors = [
      'rgba(255, 0, 255, 0.4)',
      'rgba(0, 255, 255, 0.4)',
      'rgba(255, 255, 0, 0.4)',
      'rgba(255, 0, 0, 0.4)',
      'rgba(0, 255, 0, 0.4)',
      'rgba(0, 0, 255, 0.4)',
      'rgba(255, 128, 0, 0.4)',
      'rgba(128, 0, 255, 0.4)',
    ]

    lightsRef.current = Array.from({ length: 8 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      color: discoColors[i % discoColors.length],
      size: 200 + Math.random() * 300,
      angle: Math.random() * Math.PI * 2,
      speed: 0.0005 + Math.random() * 0.002
    }))

    let time = 0

    const animate = () => {
      ctx.fillStyle = 'rgba(13, 15, 22, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      time += 0.016

      lightsRef.current.forEach((light) => {
        light.angle += light.speed

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = Math.min(canvas.width, canvas.height) * 0.4

        light.x = centerX + Math.cos(light.angle) * radius
        light.y = centerY + Math.sin(light.angle) * radius

        const gradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, light.size
        )
        gradient.addColorStop(0, light.color)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.fillStyle = gradient
        ctx.fillRect(
          light.x - light.size,
          light.y - light.size,
          light.size * 2,
          light.size * 2
        )
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const updatePlayerName = (index: number, name: string) => {
    setPlayerNames((currentNames) => {
      const newNames = [...(currentNames || [])]
      newNames[index] = name
      return newNames
    })
  }

  const handleNumPlayersChange = (value: string) => {
    setNumPlayers(value)
    setPlayerNames((currentNames) => {
      const names = currentNames || []
      const count = parseInt(value)
      const newNames = [...names]
      while (newNames.length < count) {
        newNames.push(`Player ${newNames.length + 1}`)
      }
      return newNames.slice(0, count)
    })
  }

  const handleStartLocal = () => {
    const names = playerNames || ['Player 1', 'Player 2']
    const numPlayersValue = numPlayers || '2'
    const startingChipsValue = startingChips || '500'
    const minBetValue = minBet || '10'
    
    onStartLocal({
      numPlayers: parseInt(numPlayersValue),
      playerNames: names.slice(0, parseInt(numPlayersValue)),
      startingChips: parseInt(startingChipsValue),
      minBet: parseInt(minBetValue)
    })
  }

  const handleCreateOnline = () => {
    const roomNameValue = roomName || ''
    const maxPlayersValue = maxPlayers || '4'
    const startingChipsValue = startingChips || '500'
    const minBetValue = minBet || '10'
    
    if (!roomNameValue.trim()) {
      toast.error('Please enter a room name')
      return
    }
    onCreateOnline({
      roomName: roomNameValue.trim(),
      maxPlayers: parseInt(maxPlayersValue),
      startingChips: parseInt(startingChipsValue),
      minBet: parseInt(minBetValue)
    })
  }

  const handleJoinOnline = () => {
    const joinRoomIdValue = joinRoomId || ''
    const joinPlayerNameValue = joinPlayerName || ''
    
    if (!joinRoomIdValue.trim()) {
      toast.error('Please enter a room code')
      return
    }
    if (!joinPlayerNameValue.trim()) {
      toast.error('Please enter your name')
      return
    }
    onJoinOnline(joinRoomIdValue.trim().toUpperCase(), joinPlayerNameValue.trim())
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />
      <Card className="w-full max-w-2xl p-8 relative z-10 backdrop-blur-sm bg-card/80">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Blackjack Party
            </h1>
            <p className="text-muted-foreground text-lg">
              Experience casino blackjack with immersive 3D graphics
            </p>
          </div>

          <Tabs value={gameMode || 'local'} onValueChange={(v) => setGameMode(v as 'local' | 'online')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="online">Online Multiplayer</TabsTrigger>
              <TabsTrigger value="local">Local Hot-Seat</TabsTrigger>
            </TabsList>

            <TabsContent value="online" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Create Room</h3>
                  
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Room Name</label>
                    <Input
                      value={roomName || ''}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="My Blackjack Game"
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Max Players</label>
                    <Select value={maxPlayers || '4'} onValueChange={setMaxPlayers}>
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
                    <label className="text-sm font-semibold mb-2 block">Starting Chips</label>
                    <Input
                      type="number"
                      value={startingChips || '500'}
                      onChange={(e) => setStartingChips(e.target.value)}
                      min="100"
                      max="10000"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Minimum Bet</label>
                    <Input
                      type="number"
                      value={minBet || '10'}
                      onChange={(e) => setMinBet(e.target.value)}
                      min="5"
                      max="100"
                      step="5"
                    />
                  </div>

                  <Button onClick={handleCreateOnline} size="lg" className="w-full">
                    <Play size={20} weight="fill" className="mr-2" />
                    Create Room
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Join Room</h3>
                  
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Room Code</label>
                    <Input
                      value={joinRoomId || ''}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="ABC123"
                      maxLength={6}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Your Name</label>
                    <Input
                      value={joinPlayerName || ''}
                      onChange={(e) => setJoinPlayerName(e.target.value)}
                      placeholder="Player Name"
                      maxLength={20}
                    />
                  </div>

                  <Button onClick={handleJoinOnline} size="lg" className="w-full" variant="secondary">
                    <SignIn size={20} weight="bold" className="mr-2" />
                    Join Room
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="local" className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Number of Players</label>
                <Select value={numPlayers || '2'} onValueChange={handleNumPlayersChange}>
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
                  {(playerNames || ['Player 1', 'Player 2']).map((name, index) => (
                    <Input
                      key={index}
                      value={name}
                      onChange={(e) => updatePlayerName(index, e.target.value)}
                      placeholder={`Player ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Starting Chips</label>
                  <Input
                    type="number"
                    value={startingChips || '500'}
                    onChange={(e) => setStartingChips(e.target.value)}
                    min="100"
                    max="10000"
                    step="100"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Minimum Bet</label>
                  <Input
                    type="number"
                    value={minBet || '10'}
                    onChange={(e) => setMinBet(e.target.value)}
                    min="5"
                    max="100"
                    step="5"
                  />
                </div>
              </div>

              <Button onClick={handleStartLocal} size="lg" className="w-full">
                <Users size={20} weight="bold" className="mr-2" />
                Start Local Game
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  )
}
