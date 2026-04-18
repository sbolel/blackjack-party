# Planning Guide

A multiplayer 3D blackjack game that supports both real-time online play and local hot-seat mode, featuring an immersive overhead table view with 3D card rendering.

**Experience Qualities**: 
1. **Immersive** - The 3D perspective and camera angle create the feeling of sitting at a real casino table, with depth and spatial awareness.
2. **Social** - Players can compete together whether online or locally, with clear visual feedback showing all players' actions and game state.
3. **Polished** - Smooth card animations, clear betting controls, and intuitive game flow make the experience feel professional and casino-quality.

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
  - This is a complex application requiring real-time multiplayer synchronization, 3D graphics rendering, game state management across multiple players, lobby/game room systems, and sophisticated UI for both gameplay and room management.

## Essential Features

### 1. Game Room Creation & Joining
- **Functionality**: Players can create new game rooms or join existing ones, with support for 2-4 players
- **Purpose**: Enables multiplayer sessions and manages player connections
- **Trigger**: User clicks "Create Room" or "Join Room" from the main menu
- **Progression**: Main menu → Enter room name/code → Configure settings (player count, starting chips) → Waiting lobby → Game starts when ready
- **Success criteria**: Multiple users can join the same room and see each other, room state persists and syncs across all connected players

### 2. Local Hot-Seat Mode
- **Functionality**: Multiple players take turns on the same device
- **Purpose**: Allows local multiplayer without requiring multiple devices
- **Trigger**: User selects "Local Game" from main menu
- **Progression**: Main menu → Configure player count (2-4) → Enter player names → Game begins with turn rotation
- **Success criteria**: Players can complete full games taking turns, with clear indicators of whose turn it is

### 3. 3D Blackjack Table Rendering
- **Functionality**: Overhead camera view of a blackjack table with 3D cards
- **Purpose**: Creates visual depth and immersive casino atmosphere
- **Trigger**: Automatically rendered when game starts
- **Progression**: Scene loads → Table appears → Player positions arranged around table → Cards dealt with 3D animations
- **Success criteria**: Cards have visible faces for owners, backs for others/unrevealed, smooth 3D animations, clear spatial layout

### 4. Blackjack Gameplay
- **Functionality**: Full blackjack rules - hit, stand, betting, dealer plays to 17, bust detection
- **Purpose**: Core game mechanics
- **Trigger**: Game round starts after all players bet
- **Progression**: Players place bets → Dealer deals 2 cards each → Players take turns (hit/stand) → Dealer reveals and plays → Winners determined and chips distributed
- **Success criteria**: All standard blackjack rules enforced, accurate win/loss calculations, chips update correctly

### 5. Real-time State Synchronization
- **Functionality**: All game actions sync instantly across all connected players
- **Purpose**: Enables smooth multiplayer experience
- **Trigger**: Any player action (bet, hit, stand, etc.)
- **Progression**: Player acts → State updates locally → Broadcasts to other players → Other players' UIs update
- **Success criteria**: All players see the same game state within 500ms, no desyncs or conflicts

### 6. Player Status & Chip Management
- **Functionality**: Track each player's chip count, current bet, and game status
- **Purpose**: Manages the betting economy and win/loss tracking
- **Trigger**: Continuous throughout gameplay
- **Progression**: Players start with initial chips → Bet amounts deducted → Wins/losses calculated → Chips added/removed → Players eliminated when chips reach zero
- **Success criteria**: Chip counts accurate, betting limits enforced, proper win/loss payouts

## Edge Case Handling

- **Player Disconnection**: When a player disconnects mid-game, their hand automatically stands and they're marked as inactive; game continues for remaining players
- **Room Creator Leaves**: Room persists with remaining players; oldest remaining player becomes host
- **Empty Rooms**: Rooms automatically clean up after 30 minutes of inactivity
- **Simultaneous Actions**: All player actions are queued and processed in turn order to prevent conflicts
- **Browser Refresh**: Players can rejoin their active room using stored room ID; game state restores
- **Invalid Bets**: Betting more than available chips is capped; zero bets default to minimum (5 chips)
- **Animation Interruption**: Rapid actions queue properly; animations can be skipped with visual indicator showing final state

## Design Direction

The design should evoke the sophisticated excitement of a high-end casino - luxurious yet accessible, dramatic but not overwhelming. Rich colors and smooth animations create a sense of premium quality, while clear typography and intuitive controls ensure players can focus on strategy rather than struggling with the interface. The 3D perspective adds cinematic flair without sacrificing usability.

## Color Selection

A sophisticated casino-inspired palette with rich jewel tones and metallic accents that convey luxury and excitement.

- **Primary Color**: Deep emerald green (oklch(0.45 0.12 160)) - The classic casino table felt color, instantly recognizable and associated with gambling
- **Secondary Colors**: 
  - Rich navy blue (oklch(0.25 0.08 250)) for dealer/house elements, creating authority
  - Warm gold (oklch(0.75 0.15 85)) for chip highlights and winner indicators, suggesting wealth
- **Accent Color**: Vibrant crimson (oklch(0.55 0.22 25)) for action buttons, betting, and important CTAs that demand attention
- **Foreground/Background Pairings**: 
  - Background (Deep Navy #0A1628): White text (#FFFFFF) - Ratio 15.2:1 ✓
  - Primary (Emerald Green oklch(0.45 0.12 160)): White text (#FFFFFF) - Ratio 5.8:1 ✓
  - Accent (Crimson oklch(0.55 0.22 25)): White text (#FFFFFF) - Ratio 5.2:1 ✓
  - Card faces (White #FFFFFF): Black text (#000000) - Ratio 21:1 ✓

## Font Selection

Typography should balance the elegance of a premium casino experience with the clarity needed for quick gameplay decisions - sophisticated serifs for branding combined with clean sans-serifs for UI elements and game information.

- **Typographic Hierarchy**:
  - H1 (App Title/Room Names): Playfair Display Bold/36px/tight letter-spacing - Elegant and authoritative
  - H2 (Section Headers): Playfair Display SemiBold/24px/normal - Maintains sophistication at smaller sizes
  - Body (Game Info/Instructions): Inter Regular/16px/normal line-height 1.5 - Clean and highly readable
  - UI Labels (Buttons/Controls): Inter SemiBold/14px/wide letter-spacing - Clear and actionable
  - Chip Counts/Scores: JetBrains Mono Bold/18px/tabular numbers - Precise and easy to scan

## Animations

Animations should enhance the casino experience with smooth, purposeful motion that guides attention and reinforces actions - cards sliding and flipping with realistic physics, chips stacking with satisfying weight, and subtle transitions that maintain spatial continuity. Key moments like dealing cards, revealing the dealer's hand, and winning should have celebratory flourishes, while routine actions remain quick and unobtrusive.

- Card dealing: Smooth slide from deck with slight arc and flip animation (400ms)
- Card reveal: Quick flip with easing (300ms)
- Chip betting: Chips slide into betting circle with stacking effect (200ms)
- Win celebration: Gentle pulse on winning chips, subtle particle effect (600ms)
- Turn indicator: Smooth glow pulse on active player area (1s loop)
- Button feedback: Quick scale and color shift on press (100ms)

## Component Selection

- **Components**: 
  - Dialog for room creation/joining with Input and Button components
  - Card for player info displays showing chips, bets, and status
  - Button for all game actions (Hit, Stand, Bet controls) with variant styling
  - Badge for player turn indicators and status (Active, Bust, Blackjack, etc.)
  - Slider for bet amount selection
  - Tabs for switching between Online/Local game modes
  - Alert for game over and round results
  - Avatar for player icons in multiplayer
  
- **Customizations**: 
  - Custom 3D card component using Three.js for card rendering
  - Custom betting interface with chip denomination buttons
  - Custom game table layout component managing player positions
  - Custom connection status indicator
  
- **States**: 
  - Buttons: Disabled state when not player's turn, hover with scale transform, active with pressed effect
  - Cards: Face up/down states with flip animation, highlighted when relevant to current action
  - Player areas: Active (glowing border), waiting (dimmed), bust (red tint), winner (gold highlight)
  - Bet slider: Shows current value, snaps to common bet amounts, disabled during play
  
- **Icon Selection**: 
  - Plus/Minus for bet adjustments
  - Cards (from Phosphor) for hit action
  - HandPalm for stand action
  - CurrencyDollar for chip/betting indicators
  - Users for multiplayer lobby
  - SignOut for leave room
  - Play for start game
  - Crown for dealer/winner indicators
  
- **Spacing**: 
  - Page padding: p-6 on desktop, p-4 on mobile
  - Card spacing: gap-4 for player info cards, gap-2 for button groups
  - Section spacing: space-y-6 between major UI sections
  - Card padding: p-6 for info cards, p-4 for compact cards
  - Button spacing: px-6 py-3 for primary actions, px-4 py-2 for secondary
  
- **Mobile**: 
  - 3D view scales to fill available space, camera adjusts FOV for narrower screens
  - Player info cards stack vertically instead of around table
  - Betting controls become bottom sheet instead of inline
  - Larger touch targets for all buttons (min 44px)
  - Simplified 3D rendering with fewer polygons for performance
  - Turn-based actions replace simultaneous display when space limited
