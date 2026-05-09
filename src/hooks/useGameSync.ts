import { useEffect, useCallback, useRef } from 'react'
import { GameState } from '@/lib/types'

type SyncedGameState = GameState & {
  lastUpdate?: number
}

interface GameSyncOptions {
  roomId: string
  playerId: string
  onStateUpdate: (state: GameState) => void
  enabled: boolean
}

export function useGameSync({ roomId, playerId, onStateUpdate, enabled }: GameSyncOptions) {
  const pollIntervalRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const syncState = useCallback(async () => {
    if (!enabled || !roomId) return

    try {
      const key = `game-room-${roomId}`
      const state = await spark.kv.get<SyncedGameState>(key)
      
      if (state) {
        const stateTimestamp = state.lastUpdate || 0
        if (stateTimestamp > lastUpdateRef.current) {
          lastUpdateRef.current = stateTimestamp
          onStateUpdate(state)
        }
      }
    } catch (error) {
      console.error('Error syncing game state:', error)
    }
  }, [roomId, enabled, onStateUpdate])

  const publishState = useCallback(async (state: GameState) => {
    if (!enabled || !roomId) return

    try {
      const key = `game-room-${roomId}`
      const stateWithTimestamp = {
        ...state,
        lastUpdate: Date.now()
      }
      await spark.kv.set(key, stateWithTimestamp)
      lastUpdateRef.current = Date.now()
    } catch (error) {
      console.error('Error publishing game state:', error)
    }
  }, [roomId, enabled])

  const updatePlayerStatus = useCallback(async (isActive: boolean) => {
    if (!enabled || !roomId || !playerId) return

    try {
      const key = `player-status-${roomId}-${playerId}`
      await spark.kv.set(key, {
        playerId,
        isActive,
        lastSeen: Date.now()
      })
    } catch (error) {
      console.error('Error updating player status:', error)
    }
  }, [roomId, playerId, enabled])

  const getActivePlayers = useCallback(async (): Promise<string[]> => {
    if (!enabled || !roomId) return []

    try {
      const allKeys = await spark.kv.keys()
      const statusKeys = allKeys.filter((key: string) => key.startsWith(`player-status-${roomId}-`))
      const now = Date.now()
      const activePlayers: string[] = []

      for (const key of statusKeys) {
        const status = await spark.kv.get<{ playerId: string; isActive: boolean; lastSeen: number }>(key)
        if (status && status.isActive && (now - status.lastSeen) < 30000) {
          activePlayers.push(status.playerId)
        }
      }

      return activePlayers
    } catch (error) {
      console.error('Error getting active players:', error)
      return []
    }
  }, [roomId, enabled])

  useEffect(() => {
    if (!enabled) return

    syncState()

    pollIntervalRef.current = setInterval(syncState, 1000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [enabled, syncState])

  useEffect(() => {
    if (!enabled) return

    updatePlayerStatus(true)

    const statusInterval = setInterval(() => {
      updatePlayerStatus(true)
    }, 5000)

    return () => {
      clearInterval(statusInterval)
      updatePlayerStatus(false)
    }
  }, [enabled, updatePlayerStatus])

  return {
    publishState,
    syncState,
    updatePlayerStatus,
    getActivePlayers
  }
}
