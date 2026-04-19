# Blackjack Domain Model Refactor - Summary

## Completed Changes

### 1. **src/lib/types.ts** - Enhanced Type System

#### New Types Added:
- **`PhysicalCard`**: Deterministic card model with physical identity
  - `suit`, `rank`: Card properties
  - `deckIndex`: Which physical deck (0-5 for 6-deck shoe)
  - `cardIndex`: Position within that deck (0-51)
  - `uuid`: Unique cryptographic identifier per card instance

- **`Shoe`**: Real casino shoe model
  - `cards`: Remaining cards to deal
  - `discardPile`: Already-dealt cards
  - `numDecks`: Number of decks in shoe (typically 6 or 8)
  - `penetrationCard`: Reshuffle trigger point
  - `needsReshuffle`: Boolean flag for reshuffle indicator

- **`TableRules`**: Explicit game configuration
  - `numDecks`: 6 (configurable)
  - `dealerHitsSoft17`: false (dealer stands on soft 17)
  - `doubleAfterSplitAllowed`: true
  - `surrenderAllowed`: false
  - `blackjackPayout`: 1.5 (3:2 payout)
  - `minBet`, `maxBet`: Table limits
  - `penetration`: 0.75 (75% penetration)

- **`GameStateMetadata`**: Authoritative state tracking
  - `version`: Increments with each state change
  - `createdAt`, `lastUpdatedAt`: Timestamps
  - `createdBy`: Player ID of creator
  - `authoritative`: Whether this is the canonical state

#### Modified Types:
- **`GameState`**: 
  - Replaced `deck: Card[]` with `shoe: Shoe`
  - Replaced `minBet: number` with `rules: TableRules`
  - Added `metadata: GameStateMetadata`
  - Changed `dealerHand` from `Card[]` to `PhysicalCard[]`
  - Kept backward-compatible `deck?` and `minBet?` optional fields

- **`Player`**:
  - Changed `hand` from `Card[]` to `PhysicalCard[]`

### 2. **src/lib/gameLogic.ts** - Production-Ready Randomness

#### Randomness System:
- **`WebCryptoRNG`**: Production implementation using `crypto.getRandomValues()`
  - Cryptographically secure randomness
  - No Math.random() usage
  
- **`SeededRNG`**: Deterministic RNG for testing
  - Linear congruential generator
  - Predictable, repeatable sequences
  
- **API Functions**:
  - `setRNG(rng)`: Set custom RNG
  - `useSeededRNG(seed)`: Enable test mode
  - `useWebCryptoRNG()`: Enable production mode (default)

#### UUID Generation:
- **`generateUUID()`**: RFC 4122 v4 UUIDs using Web Crypto
  - Replaces Math.random()-based IDs
  - Cryptographically unique identifiers

#### Shoe Operations:
- **`createPhysicalDeck(deckIndex)`**: Create 52 cards with deterministic identity
- **`createShoe(numDecks, penetration)`**: Build multi-deck shoe
- **`shuffleCards(cards)`**: Fisher-Yates shuffle using current RNG
- **`dealCardFromShoe(shoe)`**: Deal one card, update shoe state
- **`discardCards(shoe, cards)`**: Add cards to discard pile
- **`reshuffleShoe(shoe)`**: Combine discards + remaining, reshuffle

#### Enhanced Game Logic:
- **`createDefaultTableRules()`**: Standard 6-deck Vegas rules
- **`calculatePayout(..., blackjackPayout)`**: Configurable payout ratio
- **`shouldDealerHit(..., hitSoft17)`**: Configurable dealer rules
- **`physicalCardToCard(card)`**: Convert PhysicalCard → Card for UI compatibility

#### State Management:
- **`createGameMetadata(createdBy)`**: Initialize metadata
- **`updateMetadata(metadata)`**: Increment version, update timestamp
- **`generateRoomId()`**: Web Crypto-based room codes (6 chars)
- **`generatePlayerId()`**: UUID-based player IDs

#### Backward Compatibility:
- Kept `createDeck()` and `shuffleDeck()` for legacy Card[] model
- All card calculation functions accept `Card | PhysicalCard` union types
- Old code continues working during migration

---

## Remaining TODOs

### Phase 2: App.tsx Migration (NOT DONE YET)
The refactor intentionally stops here to avoid modifying App.tsx per requirements.

#### Required Changes for App.tsx:
1. **Replace `deck` with `shoe` throughout**
   - Update initialization: `deck: createDeck()` → `shoe: createShoe(6, 0.75)`
   - Update dealing logic: use `dealCardFromShoe()` instead of `deck.pop()`
   - Add discard pile management after rounds

2. **Add TableRules and Metadata**
   - Initialize with `createDefaultTableRules()`
   - Initialize with `createGameMetadata(currentPlayerId)`
   - Call `updateMetadata()` on every state change

3. **Update Card Dealing Flow**
   ```typescript
   // OLD:
   const card = deck.pop()!
   
   // NEW:
   const result = dealCardFromShoe(shoe)
   if (result) {
     const { card, updatedShoe } = result
     // use card, update state with updatedShoe
   }
   ```

4. **Add Reshuffle Logic**
   ```typescript
   if (shoe.needsReshuffle) {
     const newShoe = reshuffleShoe(shoe)
     // update game state
     toast.info('Shuffling shoe...')
   }
   ```

5. **Migrate minBet References**
   - Change `gameState.minBet` → `gameState.rules.minBet`
   - Update all table rule references

6. **Update Type Assertions**
   - Remove Card[] type assertions
   - Add PhysicalCard[] where needed
   - Use union types `(Card | PhysicalCard)[]` during transition

### Phase 3: Component Updates (NOT DONE YET)
1. **GameTable3D.tsx**
   - Update to handle `PhysicalCard` instead of `Card`
   - Use `card.uuid` instead of `card.id` for keys

2. **PlayerCard.tsx**
   - Handle `PhysicalCard[]` hands
   - Convert to `Card` if needed via `physicalCardToCard()`

3. **HandValue.tsx**
   - Already compatible (uses union types)

### Phase 4: Testing Infrastructure (NOT DONE YET)
1. Create test utilities using seeded RNG
2. Add deterministic shoe tests
3. Verify shuffle distribution
4. Test penetration/reshuffle triggers

### Phase 5: Online Multiplayer Enhancement (NOT DONE YET)
1. Use `metadata.version` for conflict resolution
2. Validate `authoritative` flag
3. Add state sync verification
4. Implement optimistic updates with rollback

---

## Benefits of This Refactor

### 1. **Production Security**
- No Math.random() in authoritative paths
- Cryptographically secure UUIDs
- Proper Web Crypto usage

### 2. **Physical Card Simulation**
- Every card has deterministic identity
- Can track specific cards through shoe
- Enables card counting analytics
- Realistic casino shoe behavior

### 3. **Testability**
- Seedable RNG for unit tests
- Predictable shuffle outcomes
- Deterministic game replays

### 4. **Multiplayer Ready**
- Version numbers prevent state conflicts
- Authoritative flag for host validation
- Timestamp-based reconciliation
- Room metadata for discovery

### 5. **Casino Accuracy**
- Real shoe with penetration
- Configurable table rules
- Soft 17 handling
- Proper blackjack payouts

### 6. **Backward Compatible**
- Old Card model still works
- Gradual migration path
- No breaking changes to UI
- Legacy functions preserved

---

## Migration Strategy

The refactor follows a safe, incremental approach:

1. ✅ **Phase 1 Complete**: Types and core logic updated
2. ⏳ **Phase 2 Pending**: App.tsx migration (awaiting approval)
3. ⏳ **Phase 3 Pending**: Component updates
4. ⏳ **Phase 4 Pending**: Add comprehensive tests
5. ⏳ **Phase 5 Pending**: Enhance multiplayer with new metadata

This allows for review and validation at each step before proceeding.
