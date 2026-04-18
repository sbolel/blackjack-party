export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export interface Player {
  id: string
  name: string
  chips: number
  currentBet: number
  hand: Card[]
  status: 'waiting' | 'playing' | 'standing' | 'bust' | 'blackjack' | 'won' | 'lost' | 'push'
  isDealer?: boolean
  isActive?: boolean
}

export interface GameState {
  roomId: string
  players: Player[]
  deck: Card[]
  currentPlayerIndex: number
  phase: 'lobby' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'results' | 'game-over'
  dealerHand: Card[]
  dealerRevealed: boolean
  roundNumber: number
  maxPlayers: number
  isOnline: boolean
  startingChips: number
  minBet: number
}

export type GameMode = 'online' | 'local'

export interface RoomConfig {
  roomId: string
  maxPlayers: number
  startingChips: number
  minBet: number
}
