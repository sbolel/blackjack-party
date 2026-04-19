export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface PhysicalCard {
  suit: Suit
  rank: Rank
  deckIndex: number
  cardIndex: number
  uuid: string
}

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export interface TableRules {
  numDecks: number
  dealerHitsSoft17: boolean
  doubleAfterSplitAllowed: boolean
  surrenderAllowed: boolean
  blackjackPayout: number
  minBet: number
  maxBet: number
  penetration: number
}

export interface Shoe {
  cards: PhysicalCard[]
  discardPile: PhysicalCard[]
  numDecks: number
  penetrationCard: number
  needsReshuffle: boolean
}

export interface Player {
  id: string
  name: string
  chips: number
  currentBet: number
  hand: PhysicalCard[]
  status: 'waiting' | 'playing' | 'standing' | 'bust' | 'blackjack' | 'won' | 'lost' | 'push'
  isDealer?: boolean
  isActive?: boolean
}

export interface GameStateMetadata {
  version: number
  createdAt: number
  lastUpdatedAt: number
  createdBy: string
  authoritative: boolean
}

export interface GameState {
  roomId: string
  players: Player[]
  shoe: Shoe
  currentPlayerIndex: number
  phase: 'lobby' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'results' | 'game-over'
  dealerHand: PhysicalCard[]
  dealerRevealed: boolean
  roundNumber: number
  maxPlayers: number
  isOnline: boolean
  startingChips: number
  rules: TableRules
  metadata: GameStateMetadata
  deck?: Card[]
  minBet?: number
}

export type GameMode = 'online' | 'local'

export interface RoomConfig {
  roomId: string
  maxPlayers: number
  startingChips: number
  minBet: number
}

export interface BetHistoryEntry {
  id: string
  playerId: string
  playerName: string
  roomId: string
  roundNumber: number
  betAmount: number
  result: 'won' | 'lost' | 'push' | 'blackjack'
  payout: number
  profit: number
  playerHandValue: number
  dealerHandValue: number
  timestamp: number
  isBlackjack: boolean
}

export interface PlayerStatistics {
  playerId: string
  playerName: string
  totalBets: number
  totalWagered: number
  totalWon: number
  totalLost: number
  netProfit: number
  wins: number
  losses: number
  pushes: number
  blackjacks: number
  winRate: number
  biggestWin: number
  biggestLoss: number
  averageBet: number
  currentStreak: number
  longestWinStreak: number
  longestLossStreak: number
  firstBet: number
  lastBet: number
}
