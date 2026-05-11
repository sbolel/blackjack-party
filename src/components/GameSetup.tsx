import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Play, SignIn, Pencil, Spade, Heart } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

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

interface ChipConfig {
  value: number
  color: string
  bgColor: string
  borderColor: string
}

const chipConfigs: ChipConfig[] = [
  { value: 100, color: 'text-foreground', bgColor: 'bg-muted', borderColor: 'border-muted-foreground' },
  { value: 500, color: 'text-accent-foreground', bgColor: 'bg-accent', borderColor: 'border-accent-foreground' },
  { value: 1000, color: 'text-primary-foreground', bgColor: 'bg-primary', borderColor: 'border-primary-foreground' },
  { value: 5000, color: 'text-destructive-foreground', bgColor: 'bg-destructive', borderColor: 'border-destructive-foreground' },
]

const minBetChipConfigs: ChipConfig[] = [
  { value: 5, color: 'text-primary-foreground', bgColor: 'bg-primary', borderColor: 'border-primary-foreground' },
  { value: 10, color: 'text-gold-foreground', bgColor: 'bg-gold', borderColor: 'border-gold-foreground' },
  { value: 25, color: 'text-primary-foreground', bgColor: 'bg-primary', borderColor: 'border-primary-foreground' },
  { value: 50, color: 'text-destructive-foreground', bgColor: 'bg-destructive', borderColor: 'border-destructive-foreground' },
]

export function GameSetup({ onStartLocal, onCreateOnline, onJoinOnline }: GameSetupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lightsRef = useRef<DiscoLight[]>([])
  const animationRef = useRef<number | undefined>(undefined)
  
  const [gameMode, setGameMode] = useKV<'local' | 'online'>('setup-game-mode', 'local')
  
  const [numPlayers, setNumPlayers] = useKV<string>('setup-num-players', '2')
  const [playerNames, setPlayerNames] = useKV<string[]>('setup-player-names', ['Player 1', 'Player 2'])
  const [startingChips, setStartingChips] = useKV<string>('setup-starting-chips', '500')
  const [minBet, setMinBet] = useKV<string>('setup-min-bet', '10')
  
  const [roomName, setRoomName] = useKV<string>('setup-room-name', '')
  const [maxPlayers, setMaxPlayers] = useKV<string>('setup-max-players', '4')
  const [joinRoomId, setJoinRoomId] = useKV<string>('setup-join-room-id', '')
  const [joinPlayerName, setJoinPlayerName] = useKV<string>('setup-join-player-name', '')
  
  const [editingSeat, setEditingSeat] = useState<number | null>(null)

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
      'rgba(64, 180, 120, 0.3)',
      'rgba(228, 150, 90, 0.3)',
      'rgba(205, 175, 75, 0.4)',
      'rgba(40, 120, 200, 0.25)',
      'rgba(64, 180, 120, 0.35)',
      'rgba(228, 150, 90, 0.4)',
    ]

    lightsRef.current = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      color: discoColors[i % discoColors.length],
      size: 250 + Math.random() * 350,
      angle: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.001
    }))

    const animate = () => {
      ctx.fillStyle = 'rgba(13, 15, 22, 0.08)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      lightsRef.current.forEach((light) => {
        light.angle += light.speed

        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = Math.min(canvas.width, canvas.height) * 0.35

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

  const handleNumPlayersChange = (value: number) => {
    setNumPlayers(value.toString())
    setPlayerNames((currentNames) => {
      const names = currentNames || []
      const newNames = [...names]
      while (newNames.length < value) {
        newNames.push(`Player ${newNames.length + 1}`)
      }
      return newNames.slice(0, value)
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

  const PlayerSeat = ({ index, name }: { index: number; name: string }) => {
    const isEditing = editingSeat === index
    const seatNumber = index + 1
    
    return (
      <div className="relative group">
        <div className={cn(
          "relative w-32 h-32 rounded-full border-4 transition-all duration-300",
          "bg-gradient-to-br from-primary/40 to-primary/20",
          "border-gold shadow-[0_0_20px_rgba(205,175,75,0.3)]",
          "flex flex-col items-center justify-center",
          isEditing && "ring-4 ring-gold/50 scale-105"
        )}>
          <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gold text-gold-foreground flex items-center justify-center font-black text-sm border-2 border-gold-foreground/30 shadow-lg">
            {seatNumber}
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setEditingSeat(index)}
              className="flex flex-col items-center justify-center gap-1 w-full h-full rounded-full hover:bg-primary/30 transition-colors"
            >
              <span className="text-foreground font-bold text-sm text-center px-2 line-clamp-2">
                {name}
              </span>
              <Pencil size={16} className="text-gold opacity-60 group-hover:opacity-100 transition-opacity" weight="bold" />
            </button>
          ) : (
            <Input
              autoFocus
              value={name}
              onChange={(e) => updatePlayerName(index, e.target.value)}
              onBlur={() => setEditingSeat(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingSeat(null)
              }}
              className="w-24 h-10 text-center text-sm font-bold bg-card/90 border-gold"
              maxLength={15}
            />
          )}
        </div>
        
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-muted/80 rounded text-[10px] font-mono text-muted-foreground whitespace-nowrap">
          SEAT {seatNumber}
        </div>
      </div>
    )
  }

  const ChipSelector = ({ 
    label, 
    chips, 
    value, 
    onChange 
  }: { 
    label: string
    chips: ChipConfig[]
    value: string
    onChange: (value: string) => void 
  }) => {
    return (
      <div className="space-y-3">
        <label className="text-sm font-bold text-gold uppercase tracking-wide">
          {label}
        </label>
        <div className="flex gap-2 justify-center flex-wrap">
          {chips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => onChange(chip.value.toString())}
              className={cn(
                "chip-button relative w-16 h-16 rounded-full font-black text-sm",
                "transition-all duration-200 hover:scale-110",
                chip.bgColor,
                chip.color,
                chip.borderColor,
                value === chip.value.toString() 
                  ? "scale-110 ring-4 ring-gold/50 shadow-[0_0_30px_rgba(205,175,75,0.6)]" 
                  : "shadow-[0_0_15px_rgba(0,0,0,0.5)]"
              )}
            >
              <span className="relative z-10">{chip.value}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 text-center relative">
          <div className="inline-block relative animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/20 to-transparent blur-2xl"></div>
            <div className="relative bg-gradient-to-b from-gold via-accent to-gold p-1 rounded-2xl shadow-[0_0_60px_rgba(205,175,75,0.6)]">
              <div className="bg-background/95 px-8 py-6 rounded-xl">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <Spade size={40} weight="fill" className="text-foreground" />
                  <h1 
                    className="text-6xl md:text-7xl font-bold bg-gradient-to-b from-gold via-accent to-gold bg-clip-text text-transparent"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    BLACKJACK
                  </h1>
                  <Heart size={40} weight="fill" className="text-accent" />
                </div>
                <p 
                  className="text-2xl md:text-3xl font-bold text-transparent bg-gradient-to-r from-accent via-gold to-accent bg-clip-text"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Party
                </p>
                <p className="text-sm text-muted-foreground mt-2 uppercase tracking-widest font-mono">
                  Experience Casino Blackjack with Immersive 3D Graphics
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Tabs value={gameMode || 'local'} onValueChange={(v) => {
              if (v === 'local' || v === 'online') {
                setGameMode(v)
              }
            }}>
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 bg-card/50 backdrop-blur-sm border border-gold/30">
                <TabsTrigger value="local" className="text-sm font-bold data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
                  <Users size={18} weight="bold" className="mr-2" />
                  Local Hot-Seat
                </TabsTrigger>
                <TabsTrigger value="online" className="text-sm font-bold data-[state=active]:bg-gold data-[state=active]:text-gold-foreground">
                  <Play size={18} weight="fill" className="mr-2" />
                  Online Multiplayer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="local" className="mt-8">
                <div 
                  className="relative rounded-[80px] p-8 md:p-12"
                  style={{
                    background: 'linear-gradient(135deg, rgba(64, 180, 120, 0.15) 0%, rgba(40, 120, 80, 0.15) 100%)',
                    boxShadow: '0 0 0 8px rgba(205, 175, 75, 0.3), 0 0 0 12px rgba(228, 150, 90, 0.2), inset 0 0 60px rgba(0, 0, 0, 0.3), 0 20px 60px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div className="absolute inset-0 rounded-[80px] border-4 border-gold/40 pointer-events-none"></div>
                  
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 rounded-full bg-gradient-to-r from-gold via-accent to-gold text-gold-foreground font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(205,175,75,0.6)]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Blackjack Pays 3 to 2
                  </div>

                  <div className="space-y-8">
                    <div className="text-center">
                      <label className="text-gold font-bold uppercase tracking-wide mb-4 block text-sm">
                        Number of Players
                      </label>
                      <div className="flex gap-4 justify-center">
                        {[2, 3, 4].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleNumPlayersChange(num)}
                            className={cn(
                              "chip-button relative w-20 h-20 rounded-full font-black text-xl",
                              "transition-all duration-200 hover:scale-110",
                              "bg-primary text-primary-foreground border-primary-foreground",
                              numPlayers === num.toString()
                                ? "scale-110 ring-4 ring-gold/50 shadow-[0_0_30px_rgba(205,175,75,0.6)]"
                                : "shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                            )}
                          >
                            <span className="relative z-10">{num}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-gold font-bold uppercase tracking-wide mb-4 block text-sm text-center">
                        Player Seats
                      </label>
                      <div className="flex gap-6 justify-center flex-wrap">
                        {(playerNames || ['Player 1', 'Player 2']).map((name, index) => (
                          <PlayerSeat key={index} index={index} name={name} />
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                      <ChipSelector
                        label="Starting Chips"
                        chips={chipConfigs}
                        value={startingChips || '500'}
                        onChange={setStartingChips}
                      />
                      <ChipSelector
                        label="Minimum Bet"
                        chips={minBetChipConfigs}
                        value={minBet || '10'}
                        onChange={setMinBet}
                      />
                    </div>

                    <div className="flex justify-center pt-4">
                      <button
                        onClick={handleStartLocal}
                        className="group relative overflow-hidden px-12 py-6 rounded-2xl font-black text-2xl uppercase tracking-wider transition-all duration-300 hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, rgb(205, 175, 75) 0%, rgb(228, 150, 90) 50%, rgb(205, 175, 75) 100%)',
                          boxShadow: '0 0 40px rgba(205, 175, 75, 0.6), inset 0 -4px 8px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                        <div className="relative z-10 text-gold-foreground flex flex-col items-center gap-1">
                          <span className="text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>DEAL CARDS</span>
                          <span className="text-xs font-normal tracking-normal opacity-80">Start Local Game</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="online" className="mt-8">
                <div 
                  className="relative rounded-[60px] p-8"
                  style={{
                    background: 'linear-gradient(135deg, rgba(64, 180, 120, 0.12) 0%, rgba(40, 120, 80, 0.12) 100%)',
                    boxShadow: '0 0 0 6px rgba(205, 175, 75, 0.25), 0 0 0 10px rgba(228, 150, 90, 0.15), inset 0 0 40px rgba(0, 0, 0, 0.3), 0 15px 40px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div className="absolute inset-0 rounded-[60px] border-4 border-gold/30 pointer-events-none"></div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4 p-6 rounded-3xl bg-card/40 backdrop-blur-sm border border-gold/20">
                      <h3 className="text-2xl font-bold text-gold text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Create Room
                      </h3>
                      
                      <div>
                        <label className="text-xs font-bold mb-2 block text-gold uppercase tracking-wide">Room Name</label>
                        <Input
                          value={roomName || ''}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder="My Blackjack Game"
                          maxLength={30}
                          className="chip-input h-12 text-center font-bold border-gold/50 bg-card/60"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold mb-2 block text-gold uppercase tracking-wide">Max Players</label>
                        <div className="flex gap-2 justify-center">
                          {[2, 3, 4].map((num) => (
                            <button
                              key={num}
                              onClick={() => setMaxPlayers(num.toString())}
                              className={cn(
                                "chip-button w-14 h-14 rounded-full font-black text-lg bg-primary text-primary-foreground border-primary-foreground",
                                "transition-all duration-200 hover:scale-110",
                                maxPlayers === num.toString()
                                  ? "scale-110 ring-4 ring-gold/50"
                                  : ""
                              )}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold mb-2 block text-gold uppercase tracking-wide">Starting</label>
                          <Input
                            type="number"
                            value={startingChips || '500'}
                            onChange={(e) => setStartingChips(e.target.value)}
                            min="100"
                            max="10000"
                            step="100"
                            className="chip-input h-10 text-center font-bold border-gold/50 bg-card/60"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold mb-2 block text-gold uppercase tracking-wide">Min Bet</label>
                          <Input
                            type="number"
                            value={minBet || '10'}
                            onChange={(e) => setMinBet(e.target.value)}
                            min="5"
                            max="100"
                            step="5"
                            className="chip-input h-10 text-center font-bold border-gold/50 bg-card/60"
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={handleCreateOnline} 
                        size="lg" 
                        className="w-full h-12 bg-gold hover:bg-gold/90 text-gold-foreground font-black uppercase tracking-wide shadow-[0_0_20px_rgba(205,175,75,0.4)]"
                      >
                        <Play size={20} weight="fill" className="mr-2" />
                        Create Room
                      </Button>
                    </div>

                    <div className="space-y-4 p-6 rounded-3xl bg-card/40 backdrop-blur-sm border border-gold/20">
                      <h3 className="text-2xl font-bold text-gold text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Join Room
                      </h3>
                      
                      <div>
                        <label className="text-xs font-bold mb-2 block text-gold uppercase tracking-wide">Room Code</label>
                        <Input
                          value={joinRoomId || ''}
                          onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                          placeholder="ABC123"
                          maxLength={6}
                          className="chip-input h-12 text-center font-black text-lg tracking-widest border-gold/50 bg-card/60"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold mb-2 block text-gold uppercase tracking-wide">Your Name</label>
                        <Input
                          value={joinPlayerName || ''}
                          onChange={(e) => setJoinPlayerName(e.target.value)}
                          placeholder="Player Name"
                          maxLength={20}
                          className="chip-input h-12 text-center font-bold border-gold/50 bg-card/60"
                        />
                      </div>

                      <Button 
                        onClick={handleJoinOnline} 
                        size="lg" 
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wide"
                        variant="secondary"
                      >
                        <SignIn size={20} weight="bold" className="mr-2" />
                        Join Room
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 text-xs text-muted-foreground uppercase tracking-widest font-mono">
            <div className="flex items-center gap-2">
              <Users size={16} weight="bold" className="text-gold" />
              <span>Play with Friends</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Spade size={16} weight="fill" className="text-gold" />
              <span>Place Your Bets</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="flex items-center gap-2">
              <Heart size={16} weight="fill" className="text-accent" />
              <span>Win Big</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
