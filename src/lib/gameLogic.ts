import { Card, Rank, Suit, Player } from './types'

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${Math.random()}`
      })
    }
  }

  return shuffleDeck(deck)
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck]
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
  }
  return newDeck
}

export function getCardValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

export function calculateHandValue(hand: Card[]): number {
  if (!Array.isArray(hand) || hand.length === 0) {
    return 0
  }

  let value = 0
  let aces = 0

  for (const card of hand) {
    if (!card || !card.rank) continue
    const cardValue = getCardValue(card.rank)
    value += cardValue
    if (card.rank === 'A') aces++
  }

  while (value > 21 && aces > 0) {
    value -= 10
    aces--
  }

  return value
}

export function calculateHandValues(hand: Card[]): { low: number; high: number; hasAce: boolean } {
  if (!Array.isArray(hand) || hand.length === 0) {
    return { low: 0, high: 0, hasAce: false }
  }

  let value = 0
  let aces = 0

  for (const card of hand) {
    if (!card || !card.rank) continue
    const cardValue = getCardValue(card.rank)
    value += cardValue
    if (card.rank === 'A') aces++
  }

  const hasAce = aces > 0
  const high = value

  let low = value
  let acesRemaining = aces
  while (low > 21 && acesRemaining > 0) {
    low -= 10
    acesRemaining--
  }

  if (!hasAce || low === high) {
    return { low, high: low, hasAce: false }
  }

  return { low: low, high, hasAce }
}

export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && calculateHandValue(hand) === 21
}

export function isBust(hand: Card[]): boolean {
  return calculateHandValue(hand) > 21
}

export function determineWinner(playerHand: Card[], dealerHand: Card[]): 'win' | 'lose' | 'push' {
  const playerValue = calculateHandValue(playerHand)
  const dealerValue = calculateHandValue(dealerHand)
  const playerBlackjack = isBlackjack(playerHand)
  const dealerBlackjack = isBlackjack(dealerHand)

  if (playerValue > 21) return 'lose'
  if (dealerValue > 21) return 'win'
  if (playerBlackjack && !dealerBlackjack) return 'win'
  if (!playerBlackjack && dealerBlackjack) return 'lose'
  if (playerValue > dealerValue) return 'win'
  if (playerValue < dealerValue) return 'lose'
  return 'push'
}

export function calculatePayout(bet: number, result: 'win' | 'lose' | 'push', isBlackjack: boolean): number {
  if (result === 'lose') return 0
  if (result === 'push') return bet
  if (isBlackjack) return bet + Math.floor(bet * 1.5)
  return bet * 2
}

export function shouldDealerHit(dealerHand: Card[]): boolean {
  const value = calculateHandValue(dealerHand)
  return value < 17
}

export function getCardSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }
  return symbols[suit]
}

export function getCardColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#DC2626' : '#1F2937'
}

export function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function createPlayer(name: string, chips: number): Player {
  return {
    id: generatePlayerId(),
    name,
    chips,
    currentBet: 0,
    hand: [],
    status: 'waiting'
  }
}
