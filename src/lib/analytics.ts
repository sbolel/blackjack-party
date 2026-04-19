import { BetHistoryEntry, PlayerStatistics } from './types'

export function calculatePlayerStatistics(
  history: BetHistoryEntry[],
  playerId: string
): PlayerStatistics | null {
  const playerHistory = history.filter(h => h.playerId === playerId)
  
  if (playerHistory.length === 0) return null

  const totalBets = playerHistory.length
  const totalWagered = playerHistory.reduce((sum, h) => sum + h.betAmount, 0)
  const totalWon = playerHistory
    .filter(h => h.result === 'won' || h.result === 'blackjack')
    .reduce((sum, h) => sum + h.payout, 0)
  const totalLost = playerHistory
    .filter(h => h.result === 'lost')
    .reduce((sum, h) => sum + h.betAmount, 0)
  const netProfit = playerHistory.reduce((sum, h) => sum + h.profit, 0)

  const wins = playerHistory.filter(h => h.result === 'won' || h.result === 'blackjack').length
  const losses = playerHistory.filter(h => h.result === 'lost').length
  const pushes = playerHistory.filter(h => h.result === 'push').length
  const blackjacks = playerHistory.filter(h => h.result === 'blackjack').length

  const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0

  const biggestWin = playerHistory.reduce((max, h) => 
    h.profit > max ? h.profit : max, 0
  )
  const biggestLoss = playerHistory.reduce((min, h) => 
    h.profit < min ? h.profit : min, 0
  )

  const averageBet = totalBets > 0 ? totalWagered / totalBets : 0

  const { currentStreak, longestWinStreak, longestLossStreak } = calculateStreaks(playerHistory)

  const firstBet = playerHistory.length > 0 ? playerHistory[0].timestamp : Date.now()
  const lastBet = playerHistory.length > 0 ? playerHistory[playerHistory.length - 1].timestamp : Date.now()

  return {
    playerId,
    playerName: playerHistory[0]?.playerName || 'Unknown',
    totalBets,
    totalWagered,
    totalWon,
    totalLost,
    netProfit,
    wins,
    losses,
    pushes,
    blackjacks,
    winRate,
    biggestWin,
    biggestLoss,
    averageBet,
    currentStreak,
    longestWinStreak,
    longestLossStreak,
    firstBet,
    lastBet
  }
}

function calculateStreaks(history: BetHistoryEntry[]): {
  currentStreak: number
  longestWinStreak: number
  longestLossStreak: number
} {
  let currentStreak = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  let currentWinStreak = 0
  let currentLossStreak = 0

  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    const isWin = entry.result === 'won' || entry.result === 'blackjack'
    const isLoss = entry.result === 'lost'

    if (isWin) {
      currentWinStreak++
      currentLossStreak = 0
      if (i === history.length - 1) {
        currentStreak = currentWinStreak
      }
    } else if (isLoss) {
      currentLossStreak++
      currentWinStreak = 0
      if (i === history.length - 1) {
        currentStreak = -currentLossStreak
      }
    } else {
      if (i === history.length - 1) {
        currentStreak = 0
      }
      currentWinStreak = 0
      currentLossStreak = 0
    }

    longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
    longestLossStreak = Math.max(longestLossStreak, currentLossStreak)
  }

  return { currentStreak, longestWinStreak, longestLossStreak }
}

export function getRecentHistory(
  history: BetHistoryEntry[],
  limit: number = 10
): BetHistoryEntry[] {
  return [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
}

export function getHistoryByTimeRange(
  history: BetHistoryEntry[],
  startTime: number,
  endTime: number
): BetHistoryEntry[] {
  return history.filter(h => h.timestamp >= startTime && h.timestamp <= endTime)
}

export function aggregateStatsByDay(history: BetHistoryEntry[]): {
  date: string
  totalBets: number
  totalWagered: number
  netProfit: number
  wins: number
  losses: number
}[] {
  const dayMap = new Map<string, {
    totalBets: number
    totalWagered: number
    netProfit: number
    wins: number
    losses: number
  }>()

  history.forEach(entry => {
    const date = new Date(entry.timestamp).toLocaleDateString()
    const existing = dayMap.get(date) || {
      totalBets: 0,
      totalWagered: 0,
      netProfit: 0,
      wins: 0,
      losses: 0
    }

    existing.totalBets++
    existing.totalWagered += entry.betAmount
    existing.netProfit += entry.profit
    if (entry.result === 'won' || entry.result === 'blackjack') existing.wins++
    if (entry.result === 'lost') existing.losses++

    dayMap.set(date, existing)
  })

  return Array.from(dayMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
