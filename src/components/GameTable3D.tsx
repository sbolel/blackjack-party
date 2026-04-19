import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Card3D } from './Card3D'
import { Player, Card } from '@/lib/types'
import { ErrorBoundary } from 'react-error-boundary'

interface GameTable3DProps {
  players: Player[]
  dealerHand: Card[]
  dealerRevealed: boolean
  currentPlayerId?: string
}

function FallbackComponent() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
      <div className="text-center p-6">
        <p className="text-muted-foreground mb-2">3D view unavailable</p>
        <p className="text-xs text-muted-foreground">The game continues normally</p>
      </div>
    </div>
  )
}

export function GameTable3D({ players, dealerHand, dealerRevealed, currentPlayerId }: GameTable3DProps) {
  const getPlayerPosition = (index: number, total: number): [number, number, number] => {
    const radius = 8
    const angle = (index / total) * Math.PI * 1.2 + Math.PI * 0.4
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    return [x, -0.5, z]
  }

  const getDealerCardPosition = (index: number, totalCards: number): [number, number, number] => {
    return [-totalCards * 1 + index * 2, -0.5, -6]
  }

  const getPlayerCardPosition = (playerPos: [number, number, number], cardIndex: number): [number, number, number] => {
    return [playerPos[0] - 1 + cardIndex * 1, playerPos[1], playerPos[2]]
  }

  const isValidCard = (card: any): card is Card => {
    return !!(card && typeof card === 'object' && card.id && card.suit && card.rank)
  }

  const isValidPlayer = (player: any): player is Player => {
    return !!(player && typeof player === 'object' && player.id && Array.isArray(player.hand))
  }

  const validDealerHand = Array.isArray(dealerHand) ? dealerHand.filter(isValidCard) : []
  const validPlayers = Array.isArray(players) ? players.filter(isValidPlayer) : []

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent}>
      <div className="w-full h-full">
        <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 15, 0]} rotation={[-Math.PI / 2.5, 0, 0]} />
            <OrbitControls 
              enableRotate={false}
              enableZoom={false}
              enablePan={false}
            />
            
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[0, 10, 0]} intensity={0.8} />
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
              <planeGeometry args={[30, 30]} />
              <meshStandardMaterial color="#1a472a" />
            </mesh>
            
            <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[10, 64]} />
              <meshStandardMaterial color="#2d5a3d" />
            </mesh>

            {validDealerHand.map((card, index) => {
              const pos = getDealerCardPosition(index, validDealerHand.length)
              return (
                <Card3D
                  key={`dealer-${card.id}-${index}`}
                  card={card}
                  position={pos}
                  faceUp={dealerRevealed || index === 0}
                />
              )
            })}

            {validPlayers.map((player, playerIndex) => {
              const playerPos = getPlayerPosition(playerIndex, validPlayers.length)
              const isCurrentPlayer = player.id === currentPlayerId
              const validPlayerHand = player.hand.filter(isValidCard)

              return (
                <group key={`player-${player.id}`}>
                  {validPlayerHand.map((card, cardIndex) => {
                    const cardPos = getPlayerCardPosition(playerPos, cardIndex)
                    return (
                      <Card3D
                        key={`player-${player.id}-${card.id}-${cardIndex}`}
                        card={card}
                        position={cardPos}
                        faceUp
                      />
                    )
                  })}
                  
                  {isCurrentPlayer && (
                    <mesh position={[playerPos[0], -0.8, playerPos[2]]}>
                      <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
                      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
                    </mesh>
                  )}
                </group>
              )
            })}
          </Suspense>
        </Canvas>
      </div>
    </ErrorBoundary>
  )
}
