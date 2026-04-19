import { Card, Rank, Suit, Player, PhysicalCard, Shoe, TableRules, GameStateMetadata } from './types'

interface RNG {
  nextFloat(): number
}

class WebCryptoRNG implements RNG {
  nextFloat(): number {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] / (0xFFFFFFFF + 1)
  }
}

class SeededRNG implements RNG {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  nextFloat(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
}

let currentRNG: RNG = new WebCryptoRNG()

export function setRNG(rng: RNG) {
  currentRNG = rng
}

export function useSeededRNG(seed: number) {
  currentRNG = new SeededRNG(seed)
}

export function useWebCryptoRNG() {
  currentRNG = new WebCryptoRNG()
}

function generateUUID(): string {
  const buffer = new Uint8Array(16)
  crypto.getRandomValues(buffer)
  
  buffer[6] = (buffer[6] & 0x0f) | 0x40
  buffer[8] = (buffer[8] & 0x3f) | 0x80
  
  const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createPhysicalDeck(deckIndex: number): PhysicalCard[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: PhysicalCard[] = []

  let cardIndex = 0
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        deckIndex,
        cardIndex,
        uuid: generateUUID()
      })
      cardIndex++
    }
  }

  return deck
}

export function createShoe(numDecks: number, penetration: number = 0.75): Shoe {
  const cards: PhysicalCard[] = []
  
  for (let i = 0; i < numDecks; i++) {
    cards.push(...createPhysicalDeck(i))
  }

  const shuffledCards = shuffleCards(cards)
  const totalCards = shuffledCards.length
  const penetrationCard = Math.floor(totalCards * penetration)

  return {
    cards: shuffledCards,
    discardPile: [],
    numDecks,
    penetrationCard,
    needsReshuffle: false
  }
}

export function shuffleCards(cards: PhysicalCard[]): PhysicalCard[] {
  const newCards = [...cards]
  for (let i = newCards.length - 1; i > 0; i--) {
    const j = Math.floor(currentRNG.nextFloat() * (i + 1))
    ;[newCards[i], newCards[j]] = [newCards[j], newCards[i]]
  }
  return newCards
}

export function dealCardFromShoe(shoe: Shoe): { card: PhysicalCard; updatedShoe: Shoe } | null {
  if (shoe.cards.length === 0) {
    return null
  }

  const cards = [...shoe.cards]
  const card = cards.pop()!
  
  const needsReshuffle = cards.length <= (shoe.numDecks * 52 - shoe.penetrationCard)

  return {
    card,
    updatedShoe: {
      ...shoe,
      cards,
      needsReshuffle
    }
  }
}

export function discardCards(shoe: Shoe, cards: PhysicalCard[]): Shoe {
  return {
    ...shoe,
    discardPile: [...shoe.discardPile, ...cards]
  }
}

export function reshuffleShoe(shoe: Shoe): Shoe {
  const allCards = [...shoe.cards, ...shoe.discardPile]
  const shuffledCards = shuffleCards(allCards)
  const totalCards = shuffledCards.length
  const penetrationCard = Math.floor(totalCards * (shoe.penetrationCard / (shoe.numDecks * 52)))

  return {
    ...shoe,
    cards: shuffledCards,
    discardPile: [],
    penetrationCard,
    needsReshuffle: false
  }
}

export function createDefaultTableRules(): TableRules {
  return {
    numDecks: 6,
    dealerHitsSoft17: false,
    doubleAfterSplitAllowed: true,
    surrenderAllowed: false,
    blackjackPayout: 1.5,
    minBet: 10,
    maxBet: 1000,
    penetration: 0.75
  }
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
  const deck: Card[] = []

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${currentRNG.nextFloat()}`
      })
    }
  }

  return shuffleDeck(deck)
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck]
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(currentRNG.nextFloat() * (i + 1))
    ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
  }
  return newDeck
}

export function physicalCardToCard(card: PhysicalCard): Card {
  return {
    suit: card.suit,
    rank: card.rank,
    id: card.uuid
  }
}

export function getCardValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

export function calculateHandValue(hand: (Card | PhysicalCard)[]): number {
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

export function calculateHandValues(hand: (Card | PhysicalCard)[]): { low: number; high: number; hasAce: boolean } {
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

export function isBlackjack(hand: (Card | PhysicalCard)[]): boolean {
  return hand.length === 2 && calculateHandValue(hand) === 21
}

export function isBust(hand: (Card | PhysicalCard)[]): boolean {
  return calculateHandValue(hand) > 21
}

export function determineWinner(playerHand: (Card | PhysicalCard)[], dealerHand: (Card | PhysicalCard)[]): 'win' | 'lose' | 'push' {
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

export function calculatePayout(bet: number, result: 'win' | 'lose' | 'push', isBlackjack: boolean, blackjackPayout: number = 1.5): number {
  if (result === 'lose') return 0
  if (result === 'push') return bet
  if (isBlackjack) return bet + Math.floor(bet * blackjackPayout)
  return bet * 2
}

export function shouldDealerHit(dealerHand: (Card | PhysicalCard)[], hitSoft17: boolean = false): boolean {
  const value = calculateHandValue(dealerHand)
  
  if (value < 17) return true
  if (value > 17) return false
  
  if (hitSoft17 && value === 17) {
    let hasAce = false
    let total = 0
    for (const card of dealerHand) {
      if (card.rank === 'A') hasAce = true
      total += getCardValue(card.rank)
    }
    return hasAce && total > 17
  }
  
  return false
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
  const buffer = new Uint8Array(3)
  crypto.getRandomValues(buffer)
  return Array.from(buffer).map(b => b.toString(36).toUpperCase()).join('').substring(0, 6)
}

export function generatePlayerId(): string {
  return `player-${Date.now()}-${generateUUID().substring(0, 8)}`
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

export function createGameMetadata(createdBy: string): GameStateMetadata {
  const now = Date.now()
  return {
    version: 1,
    createdAt: now,
    lastUpdatedAt: now,
    createdBy,
    authoritative: true
  }
}

export function updateMetadata(metadata: GameStateMetadata): GameStateMetadata {
  return {
    ...metadata,
    lastUpdatedAt: Date.now(),
    version: metadata.version + 1
  }
}
