import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Card3D } from './Card3D'
import { Player, Card } from '@/lib/types'

interface GameTable3DProps {
  players: Player[]
  dealerHand: Card[]
  dealerRevealed: boolean
  currentPlayerId?: string
}

export function GameTable3D({ players, dealerHand, dealerRevealed, currentPlayerId }: GameTable3DProps) {
  const getPlayerPosition = (index: number, total: number): [number, number, number] => {
    const radius = 8
    const angle = (index / total) * Math.PI * 1.2 + Math.PI * 0.4
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    return [x, -0.5, z]
  }

  const getDealerCardPosition = (index: number): [number, number, number] => {
    return [-dealerHand.length * 1 + index * 2, -0.5, -6]
  }

  const getPlayerCardPosition = (playerPos: [number, number, number], cardIndex: number): [number, number, number] => {
    return [playerPos[0] - 1 + cardIndex * 1, playerPos[1], playerPos[2]]
  }

  return (
    <div className="w-full h-full">
      <Canvas>
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

        {dealerHand && dealerHand.filter(card => card && card.id).map((card, index) => (
          <Card3D
            key={card.id}
            card={card}
            position={getDealerCardPosition(index)}
            faceUp={dealerRevealed || index === 0}
          />
        ))}

        {players && players.filter(p => p && p.id).map((player, playerIndex) => {
          const playerPos = getPlayerPosition(playerIndex, players.length)
          const isCurrentPlayer = player.id === currentPlayerId

          return (
            <group key={player.id}>
              {player.hand && player.hand.filter(card => card && card.id).map((card, cardIndex) => (
                <Card3D
                  key={card.id}
                  card={card}
                  position={getPlayerCardPosition(playerPos, cardIndex)}
                  faceUp={true}
                />
              ))}
              
              {isCurrentPlayer && (
                <mesh position={[playerPos[0], -0.8, playerPos[2]]}>
                  <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
                </mesh>
              )}
            </group>
          )
        })}
      </Canvas>
    </div>
  )
}
