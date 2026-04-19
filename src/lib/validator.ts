import { GameState, Player, PhysicalCard, Shoe } from './types'
import { calculateHandValue } from './gameLogic'

export interface ValidationError {
  code: string
  message: string
  context?: Record<string, unknown>
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

function createError(code: string, message: string, context?: Record<string, unknown>): ValidationError {
  return { code, message, context }
}

function totalCardsInPlay(state: GameState): number {
  let count = 0
  
  count += state.shoe.cards.length
  count += state.shoe.discardPile.length
  count += state.dealerHand.length
  
  for (const player of state.players) {
    count += player.hand.length
  }
  
  return count
}

function getAllCardUUIDs(state: GameState): string[] {
  const uuids: string[] = []
  
  uuids.push(...state.shoe.cards.map(c => c.uuid))
  uuids.push(...state.shoe.discardPile.map(c => c.uuid))
  uuids.push(...state.dealerHand.map(c => c.uuid))
  
  for (const player of state.players) {
    uuids.push(...player.hand.map(c => c.uuid))
  }
  
  return uuids
}

function validateCardConservation(state: GameState): ValidationError[] {
  const errors: ValidationError[] = []
  const expectedTotal = state.shoe.numDecks * 52
  const actualTotal = totalCardsInPlay(state)
  
  if (actualTotal !== expectedTotal) {
    errors.push(createError(
      'CARD_CONSERVATION_VIOLATION',
      `Total cards in play (${actualTotal}) does not match expected (${expectedTotal})`,
      { expected: expectedTotal, actual: actualTotal }
    ))
  }
  
  const uuids = getAllCardUUIDs(state)
  const uniqueUUIDs = new Set(uuids)
  
  if (uuids.length !== uniqueUUIDs.size) {
    const duplicates = uuids.filter((uuid, index) => uuids.indexOf(uuid) !== index)
    errors.push(createError(
      'DUPLICATE_CARDS',
      'Duplicate card UUIDs detected in game state',
      { duplicates: [...new Set(duplicates)] }
    ))
  }
  
  return errors
}

function validateChipInvariants(state: GameState): ValidationError[] {
  const errors: ValidationError[] = []
  
  for (const player of state.players) {
    if (player.chips < 0) {
      errors.push(createError(
        'NEGATIVE_CHIPS',
        `Player ${player.name} has negative chips`,
        { playerId: player.id, chips: player.chips }
      ))
    }
    
    if (player.currentBet < 0) {
      errors.push(createError(
        'NEGATIVE_BET',
        `Player ${player.name} has negative bet`,
        { playerId: player.id, bet: player.currentBet }
      ))
    }
    
    if (player.currentBet > 0 && player.currentBet < state.rules.minBet) {
      errors.push(createError(
        'BET_BELOW_MINIMUM',
        `Player ${player.name} bet below minimum`,
        { playerId: player.id, bet: player.currentBet, minBet: state.rules.minBet }
      ))
    }
    
    if (player.currentBet > state.rules.maxBet) {
      errors.push(createError(
        'BET_ABOVE_MAXIMUM',
        `Player ${player.name} bet above maximum`,
        { playerId: player.id, bet: player.currentBet, maxBet: state.rules.maxBet }
      ))
    }
  }
  
  return errors
}

function validatePhaseTransition(state: GameState, expectedPhases: GameState['phase'][]): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (!expectedPhases.includes(state.phase)) {
    errors.push(createError(
      'INVALID_PHASE',
      `Game is in invalid phase: ${state.phase}`,
      { phase: state.phase, expectedPhases }
    ))
  }
  
  return errors
}

function validatePhaseConsistency(state: GameState): ValidationError[] {
  const errors: ValidationError[] = []
  
  switch (state.phase) {
    case 'lobby':
      if (state.dealerHand.length > 0) {
        errors.push(createError('PHASE_CONSISTENCY', 'Dealer should not have cards in lobby phase'))
      }
      for (const player of state.players) {
        if (player.hand.length > 0) {
          errors.push(createError('PHASE_CONSISTENCY', `Player ${player.name} should not have cards in lobby phase`))
        }
        if (player.currentBet > 0) {
          errors.push(createError('PHASE_CONSISTENCY', `Player ${player.name} should not have bet in lobby phase`))
        }
      }
      break
      
    case 'betting':
      if (state.dealerHand.length > 0) {
        errors.push(createError('PHASE_CONSISTENCY', 'Dealer should not have cards in betting phase'))
      }
      for (const player of state.players) {
        if (player.hand.length > 0) {
          errors.push(createError('PHASE_CONSISTENCY', `Player ${player.name} should not have cards in betting phase`))
        }
      }
      break
      
    case 'dealing':
    case 'playing':
    case 'dealer-turn':
      if (state.dealerHand.length < 2) {
        errors.push(createError('PHASE_CONSISTENCY', `Dealer should have at least 2 cards in ${state.phase} phase`))
      }
      for (const player of state.players) {
        if (player.currentBet > 0 && player.hand.length < 2) {
          errors.push(createError('PHASE_CONSISTENCY', `Player ${player.name} with bet should have at least 2 cards in ${state.phase} phase`))
        }
      }
      break
      
    case 'results':
      if (state.dealerHand.length < 2) {
        errors.push(createError('PHASE_CONSISTENCY', 'Dealer should have cards in results phase'))
      }
      if (!state.dealerRevealed) {
        errors.push(createError('PHASE_CONSISTENCY', 'Dealer cards should be revealed in results phase'))
      }
      break
  }
  
  return errors
}

function validateDealerRules(state: GameState): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (state.phase === 'results' && state.dealerRevealed) {
    const dealerValue = calculateHandValue(state.dealerHand)
    const dealerBust = dealerValue > 21
    
    if (!dealerBust) {
      if (dealerValue < 17) {
        errors.push(createError(
          'DEALER_RULE_VIOLATION',
          'Dealer should have hit (value < 17)',
          { dealerValue }
        ))
      }
      
      if (dealerValue === 17 && state.rules.dealerHitsSoft17) {
        let hasAce = false
        let total = 0
        for (const card of state.dealerHand) {
          if (card.rank === 'A') hasAce = true
          total += card.rank === 'A' ? 11 : (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K' ? 10 : parseInt(card.rank))
        }
        const isSoft17 = hasAce && total > 17
        
        if (isSoft17) {
          errors.push(createError(
            'DEALER_RULE_VIOLATION',
            'Dealer should have hit soft 17',
            { dealerValue }
          ))
        }
      }
    }
  }
  
  return errors
}

function validatePlayerCount(state: GameState): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (state.players.length > state.maxPlayers) {
    errors.push(createError(
      'TOO_MANY_PLAYERS',
      `Player count (${state.players.length}) exceeds maximum (${state.maxPlayers})`,
      { playerCount: state.players.length, maxPlayers: state.maxPlayers }
    ))
  }
  
  if (state.players.length === 0 && state.phase !== 'lobby') {
    errors.push(createError(
      'NO_PLAYERS',
      'Game has no players outside of lobby phase'
    ))
  }
  
  return errors
}

function validateCurrentPlayer(state: GameState): ValidationError[] {
  const errors: ValidationError[] = []
  
  if (state.currentPlayerIndex < 0) {
    errors.push(createError(
      'INVALID_PLAYER_INDEX',
      'Current player index is negative',
      { currentPlayerIndex: state.currentPlayerIndex }
    ))
  }
  
  if (state.currentPlayerIndex >= state.players.length) {
    errors.push(createError(
      'INVALID_PLAYER_INDEX',
      'Current player index is out of bounds',
      { currentPlayerIndex: state.currentPlayerIndex, playerCount: state.players.length }
    ))
  }
  
  return errors
}

export function validateGameState(state: GameState): ValidationResult {
  const errors: ValidationError[] = []
  
  errors.push(...validateCardConservation(state))
  errors.push(...validateChipInvariants(state))
  errors.push(...validatePhaseConsistency(state))
  errors.push(...validateDealerRules(state))
  errors.push(...validatePlayerCount(state))
  errors.push(...validateCurrentPlayer(state))
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function assertValidGameState(state: GameState): void {
  const result = validateGameState(state)
  if (!result.valid) {
    const errorMessages = result.errors.map(e => `[${e.code}] ${e.message}`).join('\n')
    throw new Error(`Invalid game state:\n${errorMessages}`)
  }
}
