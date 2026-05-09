import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, SignOut, Play, Users } from '@phosphor-icons/react'
import { AppPlayer } from '@/lib/types'
import { toast } from 'sonner'

interface LobbyWaitingProps {
  roomId: string
  roomName: string
  players: AppPlayer[]
  maxPlayers: number
  isHost: boolean
  onStartGame: () => void
  onLeave: () => void
}

export function LobbyWaiting({
  roomId,
  roomName,
  players,
  maxPlayers,
  isHost,
  onStartGame,
  onLeave
}: LobbyWaitingProps) {
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
    toast.success('Room code copied to clipboard!')
  }

  const canStart = players.length >= 2

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              {roomName}
            </h1>
            <p className="text-muted-foreground">
              Waiting for players to join...
            </p>
          </div>

          <div className="bg-muted rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Room Code</p>
                <p className="text-3xl font-mono font-bold tracking-wider">{roomId}</p>
              </div>
              <Button onClick={copyRoomCode} variant="outline" size="sm">
                <Copy size={18} weight="bold" className="mr-2" />
                Copy Code
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Users size={20} className="text-muted-foreground" weight="bold" />
              <span className="text-sm text-muted-foreground">
                {players.length} / {maxPlayers} players
              </span>
              <Badge variant={canStart ? 'default' : 'secondary'} className="ml-auto">
                {canStart ? 'Ready to Start' : 'Need More Players'}
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Players in Lobby</h3>
            <div className="grid gap-3">
              {players.map((player, index) => (
                <Card key={player.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {index === 0 ? 'Host' : 'Player'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                </Card>
              ))}
              
              {Array.from({ length: maxPlayers - players.length }).map((_, index) => (
                <Card key={`empty-${index}`} className="p-4 border-dashed opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                      <Users size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Waiting for player...</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onLeave}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <SignOut size={20} weight="bold" className="mr-2" />
              Leave Room
            </Button>
            
            {isHost && (
              <Button
                onClick={onStartGame}
                variant="default"
                size="lg"
                className="flex-1"
                disabled={!canStart}
              >
                <Play size={20} weight="fill" className="mr-2" />
                Start Game
              </Button>
            )}
          </div>

          {!isHost && (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for host to start the game...
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
