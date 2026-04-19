import { GameState, Player, PhysicalCard } from './types'
import { 
  dealCardFromShoe, 
  discardCards, 
  calculateHandValue, 
  isBlackjack, 
  isBust,
  shouldDealerHit,
  determineWinner,
  calculatePayout,
  updateMetadata
} from './gameLogic'
import { assertValidGameState } from './validator'

export interface EngineError {
  code: string
  message: string
  context?: Record<string, unknown>
}

export type EngineResult<T> = 
  | { success: true; state: T }
  | { success: false; error: EngineError }

function createEngineError(code: string, message: string, context?: Record<string, unknown>): EngineError {
  return { code, message, context }
}

function ok<T>(state: T): EngineResult<T> {
  return { success: true, state }
}

function err<T>(error: EngineError): EngineResult<T> {
  return { success: false, error }
}

export function placeBet(state: GameState, playerId: string, amount: number): EngineResult<GameState> {
  if (state.phase !== 'betting') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Bets can only be placed during betting phase',
      { currentPhase: state.phase, playerId, amount }
    ))
  }

  const playerIndex = state.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) {
    return err(createEngineError(
      'PLAYER_NOT_FOUND',
      'Player not found in game',
      { playerId, amount }
    ))
  }

  const player = state.players[playerIndex]

  if (player.currentBet > 0) {
    return err(createEngineError(
      'BET_ALREADY_PLACED',
      'Player has already placed a bet this round',
      { playerId, existingBet: player.currentBet, newBet: amount }
    ))
  }

  if (amount < state.rules.minBet) {
    return err(createEngineError(
      'BET_BELOW_MINIMUM',
      'Bet amount is below table minimum',
      { playerId, amount, minBet: state.rules.minBet }
    ))
  }

  if (amount > state.rules.maxBet) {
    return err(createEngineError(
      'BET_ABOVE_MAXIMUM',
      'Bet amount is above table maximum',
      { playerId, amount, maxBet: state.rules.maxBet }
    ))
  }

  if (amount > player.chips) {
    return err(createEngineError(
      'INSUFFICIENT_CHIPS',
      'Player does not have enough chips',
      { playerId, amount, availableChips: player.chips }
    ))
  }

  const updatedPlayer: Player = {
    ...player,
    currentBet: amount,
    chips: player.chips - amount
  }

  const updatedPlayers = [...state.players]
  updatedPlayers[playerIndex] = updatedPlayer

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function startRound(state: GameState): EngineResult<GameState> {
  if (state.phase !== 'betting') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Round can only be started from betting phase',
      { currentPhase: state.phase }
    ))
  }

  const playersWithBets = state.players.filter(p => p.currentBet > 0)
  
  if (playersWithBets.length === 0) {
    return err(createEngineError(
      'NO_BETS_PLACED',
      'Cannot start round without any bets',
      { playerCount: state.players.length }
    ))
  }

  const playersWithoutBets = state.players.filter(p => p.currentBet === 0)
  if (playersWithoutBets.length > 0) {
    return err(createEngineError(
      'NOT_ALL_BETS_PLACED',
      'All players must place bets before starting',
      { playersWithoutBets: playersWithoutBets.map(p => p.id) }
    ))
  }

  const newState: GameState = {
    ...state,
    phase: 'dealing',
    currentPlayerIndex: 0,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function dealInitialCards(state: GameState): EngineResult<GameState> {
  if (state.phase !== 'dealing') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Initial cards can only be dealt during dealing phase',
      { currentPhase: state.phase }
    ))
  }

  if (state.dealerHand.length > 0) {
    return err(createEngineError(
      'CARDS_ALREADY_DEALT',
      'Dealer already has cards',
      { dealerHandSize: state.dealerHand.length }
    ))
  }

  const playersWithCards = state.players.filter(p => p.hand.length > 0)
  if (playersWithCards.length > 0) {
    return err(createEngineError(
      'CARDS_ALREADY_DEALT',
      'Some players already have cards',
      { playersWithCards: playersWithCards.map(p => p.id) }
    ))
  }

  let currentShoe = state.shoe
  const updatedPlayers: Player[] = []
  
  const cardsNeeded = (state.players.length * 2) + 2
  if (currentShoe.cards.length < cardsNeeded) {
    return err(createEngineError(
      'INSUFFICIENT_CARDS',
      'Not enough cards in shoe to deal',
      { cardsNeeded, cardsAvailable: currentShoe.cards.length }
    ))
  }

  for (const player of state.players) {
    const card1Result = dealCardFromShoe(currentShoe)
    if (!card1Result) {
      return err(createEngineError('SHOE_EMPTY', 'Shoe ran out of cards during deal'))
    }
    currentShoe = card1Result.updatedShoe

    const card2Result = dealCardFromShoe(currentShoe)
    if (!card2Result) {
      return err(createEngineError('SHOE_EMPTY', 'Shoe ran out of cards during deal'))
    }
    currentShoe = card2Result.updatedShoe

    const hand = [card1Result.card, card2Result.card]
    const handIsBlackjack = isBlackjack(hand)

    updatedPlayers.push({
      ...player,
      hand,
      status: handIsBlackjack ? 'blackjack' : 'playing'
    })
  }

  const dealerCard1Result = dealCardFromShoe(currentShoe)
  if (!dealerCard1Result) {
    return err(createEngineError('SHOE_EMPTY', 'Shoe ran out of cards for dealer'))
  }
  currentShoe = dealerCard1Result.updatedShoe

  const dealerCard2Result = dealCardFromShoe(currentShoe)
  if (!dealerCard2Result) {
    return err(createEngineError('SHOE_EMPTY', 'Shoe ran out of cards for dealer'))
  }
  currentShoe = dealerCard2Result.updatedShoe

  const dealerHand = [dealerCard1Result.card, dealerCard2Result.card]

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    shoe: currentShoe,
    dealerHand,
    dealerRevealed: false,
    phase: 'playing',
    currentPlayerIndex: 0,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function playerHit(state: GameState, playerId: string): EngineResult<GameState> {
  if (state.phase !== 'playing') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Player can only hit during playing phase',
      { currentPhase: state.phase, playerId }
    ))
  }

  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return err(createEngineError(
      'NOT_CURRENT_PLAYER',
      'Only the current player can hit',
      { playerId, currentPlayerId: currentPlayer?.id, currentPlayerIndex: state.currentPlayerIndex }
    ))
  }

  if (currentPlayer.status !== 'playing') {
    return err(createEngineError(
      'INVALID_PLAYER_STATUS',
      'Player cannot hit with current status',
      { playerId, status: currentPlayer.status }
    ))
  }

  const cardResult = dealCardFromShoe(state.shoe)
  if (!cardResult) {
    return err(createEngineError(
      'SHOE_EMPTY',
      'No cards available in shoe',
      { playerId }
    ))
  }

  const newHand = [...currentPlayer.hand, cardResult.card]
  const handIsBust = isBust(newHand)

  const updatedPlayer: Player = {
    ...currentPlayer,
    hand: newHand,
    status: handIsBust ? 'bust' : 'playing'
  }

  const updatedPlayers = [...state.players]
  updatedPlayers[state.currentPlayerIndex] = updatedPlayer

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    shoe: cardResult.updatedShoe,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function playerStand(state: GameState, playerId: string): EngineResult<GameState> {
  if (state.phase !== 'playing') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Player can only stand during playing phase',
      { currentPhase: state.phase, playerId }
    ))
  }

  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return err(createEngineError(
      'NOT_CURRENT_PLAYER',
      'Only the current player can stand',
      { playerId, currentPlayerId: currentPlayer?.id }
    ))
  }

  if (currentPlayer.status !== 'playing') {
    return err(createEngineError(
      'INVALID_PLAYER_STATUS',
      'Player cannot stand with current status',
      { playerId, status: currentPlayer.status }
    ))
  }

  const updatedPlayer: Player = {
    ...currentPlayer,
    status: 'standing'
  }

  const updatedPlayers = [...state.players]
  updatedPlayers[state.currentPlayerIndex] = updatedPlayer

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function advanceTurn(state: GameState): EngineResult<GameState> {
  if (state.phase !== 'playing') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Turn can only advance during playing phase',
      { currentPhase: state.phase }
    ))
  }

  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer) {
    return err(createEngineError(
      'INVALID_PLAYER_INDEX',
      'Current player index is invalid',
      { currentPlayerIndex: state.currentPlayerIndex, playerCount: state.players.length }
    ))
  }

  if (currentPlayer.status === 'playing') {
    return err(createEngineError(
      'PLAYER_STILL_PLAYING',
      'Current player has not finished their turn',
      { playerId: currentPlayer.id, status: currentPlayer.status }
    ))
  }

  const nextPlayingIndex = state.players.findIndex((p, idx) => 
    idx > state.currentPlayerIndex && p.status === 'playing'
  )

  if (nextPlayingIndex !== -1) {
    const newState: GameState = {
      ...state,
      currentPlayerIndex: nextPlayingIndex,
      metadata: updateMetadata(state.metadata)
    }

    try {
      assertValidGameState(newState)
    } catch (e) {
      return err(createEngineError(
        'VALIDATION_FAILED',
        'Resulting state failed validation',
        { originalError: e instanceof Error ? e.message : String(e) }
      ))
    }

    return ok(newState)
  }

  const newState: GameState = {
    ...state,
    phase: 'dealer-turn',
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function playDealerTurn(state: GameState): EngineResult<GameState> {
  if (state.phase !== 'dealer-turn') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Dealer can only play during dealer-turn phase',
      { currentPhase: state.phase }
    ))
  }

  if (state.dealerHand.length < 2) {
    return err(createEngineError(
      'INVALID_DEALER_HAND',
      'Dealer must have at least 2 cards',
      { dealerHandSize: state.dealerHand.length }
    ))
  }

  let currentShoe = state.shoe
  let dealerHand = [...state.dealerHand]
  let dealerRevealed = true

  const allPlayersBust = state.players.every(p => p.status === 'bust')
  
  if (!allPlayersBust) {
    while (shouldDealerHit(dealerHand, state.rules.dealerHitsSoft17)) {
      const cardResult = dealCardFromShoe(currentShoe)
      if (!cardResult) {
        return err(createEngineError(
          'SHOE_EMPTY',
          'Shoe ran out of cards during dealer turn'
        ))
      }
      
      dealerHand = [...dealerHand, cardResult.card]
      currentShoe = cardResult.updatedShoe

      if (isBust(dealerHand)) {
        break
      }
    }
  }

  const newState: GameState = {
    ...state,
    dealerHand,
    dealerRevealed,
    shoe: currentShoe,
    phase: 'results',
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function settleRound(state: GameState): EngineResult<GameState> {
  if (state.phase !== 'results') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Round can only be settled during results phase',
      { currentPhase: state.phase }
    ))
  }

  if (!state.dealerRevealed) {
    return err(createEngineError(
      'DEALER_NOT_REVEALED',
      'Dealer cards must be revealed before settling'
    ))
  }

  const updatedPlayers: Player[] = state.players.map(player => {
    if (player.currentBet === 0) {
      return player
    }

    let finalStatus: Player['status']
    let payout = 0

    if (player.status === 'bust') {
      finalStatus = 'lost'
      payout = 0
    } else {
      const result = determineWinner(player.hand, state.dealerHand)
      const playerHasBlackjack = isBlackjack(player.hand)
      payout = calculatePayout(player.currentBet, result, playerHasBlackjack, state.rules.blackjackPayout)

      if (result === 'win') {
        finalStatus = playerHasBlackjack ? 'blackjack' : 'won'
      } else if (result === 'lose') {
        finalStatus = 'lost'
      } else {
        finalStatus = 'push'
      }
    }

    return {
      ...player,
      chips: player.chips + payout,
      status: finalStatus
    }
  })

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}

export function prepareNextRound(state: GameState): EngineResult<GameState> {
  if (state.phase !== 'results') {
    return err(createEngineError(
      'INVALID_PHASE',
      'Next round can only be prepared from results phase',
      { currentPhase: state.phase }
    ))
  }

  const allCardsToDiscard: PhysicalCard[] = [
    ...state.dealerHand,
    ...state.players.flatMap(p => p.hand)
  ]

  const updatedShoe = discardCards(state.shoe, allCardsToDiscard)

  const updatedPlayers: Player[] = state.players.map(player => ({
    ...player,
    hand: [],
    currentBet: 0,
    status: player.chips >= state.rules.minBet ? 'waiting' : 'lost'
  }))

  const activePlayers = updatedPlayers.filter(p => p.chips >= state.rules.minBet)

  if (activePlayers.length === 0) {
    const newState: GameState = {
      ...state,
      players: updatedPlayers,
      shoe: updatedShoe,
      dealerHand: [],
      dealerRevealed: false,
      phase: 'game-over',
      currentPlayerIndex: 0,
      metadata: updateMetadata(state.metadata)
    }

    try {
      assertValidGameState(newState)
    } catch (e) {
      return err(createEngineError(
        'VALIDATION_FAILED',
        'Resulting state failed validation',
        { originalError: e instanceof Error ? e.message : String(e) }
      ))
    }

    return ok(newState)
  }

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    shoe: updatedShoe,
    dealerHand: [],
    dealerRevealed: false,
    phase: 'betting',
    currentPlayerIndex: 0,
    roundNumber: state.roundNumber + 1,
    metadata: updateMetadata(state.metadata)
  }

  try {
    assertValidGameState(newState)
  } catch (e) {
    return err(createEngineError(
      'VALIDATION_FAILED',
      'Resulting state failed validation',
      { originalError: e instanceof Error ? e.message : String(e) }
    ))
  }

  return ok(newState)
}
