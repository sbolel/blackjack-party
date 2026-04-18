import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Card } from '@/lib/types'
import { getCardSymbol, getCardColor } from '@/lib/gameLogic'

interface Card3DProps {
  card: Card
  position: [number, number, number]
  rotation?: [number, number, number]
  faceUp: boolean
  onClick?: () => void
}

export function Card3D({ card, position, rotation = [0, 0, 0], faceUp }: Card3DProps) {
  const meshRef = useRef<THREE.Group>(null)
  const targetRotation = useRef(faceUp ? 0 : Math.PI)

  useFrame(() => {
    if (meshRef.current) {
      const currentY = meshRef.current.rotation.y
      const diff = targetRotation.current - currentY
      if (Math.abs(diff) > 0.01) {
        meshRef.current.rotation.y += diff * 0.1
      }
    }
  })

  useMemo(() => {
    targetRotation.current = faceUp ? 0 : Math.PI
  }, [faceUp])

  const cardTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 358
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, 256, 358)
      
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.strokeRect(4, 4, 248, 350)
      
      const symbol = getCardSymbol(card.suit)
      const color = getCardColor(card.suit)
      
      ctx.fillStyle = color
      ctx.font = 'bold 48px Arial'
      ctx.fillText(card.rank, 20, 60)
      ctx.font = '64px Arial'
      ctx.fillText(symbol, 20, 130)
      
      ctx.save()
      ctx.translate(256, 358)
      ctx.rotate(Math.PI)
      ctx.font = 'bold 48px Arial'
      ctx.fillText(card.rank, 20, 60)
      ctx.font = '64px Arial'
      ctx.fillText(symbol, 20, 130)
      ctx.restore()
      
      ctx.font = '128px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(symbol, 128, 179)
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [card])

  const backTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 358
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.fillStyle = '#1E40AF'
      ctx.fillRect(0, 0, 256, 358)
      
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 8
      ctx.strokeRect(10, 10, 236, 338)
      
      ctx.strokeStyle = '#FCD34D'
      ctx.lineWidth = 4
      ctx.strokeRect(20, 20, 216, 318)
      
      ctx.fillStyle = '#FCD34D'
      ctx.font = 'bold 36px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('♠ ♥ ♣ ♦', 128, 179)
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [])

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[1.8, 2.5, 0.05]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[1.75, 2.45]} />
        <meshBasicMaterial map={cardTexture} />
      </mesh>
      
      <mesh position={[0, 0, -0.026]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.75, 2.45]} />
        <meshBasicMaterial map={backTexture} />
      </mesh>
    </group>
  )
}
