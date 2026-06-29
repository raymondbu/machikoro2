# Machi Koro 2 Test Cases

These scenarios map `docs/game-rules.md` to automated tests.

## Unit Tests

- Initializes a game in `initial_build` with 5 coins per player, no
  establishments, no built landmarks, and two 5-card market rows.
- Rejects dice rolls during `initial_build`.
- Advances setup purchases through 3 full table rounds, then enters
  `roll_dice`.
- Gives the active setup player 1 coin without advancing the turn when they
  cannot afford any visible establishment.
- Rejects setup coin taking while the active player can afford a visible
  establishment.
- Rejects dice rolls from non-active players.
- Allows the active player to roll 1 or 2 dice during normal play.
- Resolves income and moves to `construct`.
- Resolves red card payments before active-player income.
- Applies red card payments without taking more than the active player has.
- Pauses purple target cards until the active player resolves the target.
- Buys an establishment, subtracts coins, updates the matching marketplace row,
  and advances the turn.
- Builds a non-winning landmark, subtracts coins, advances the turn, and does
  not set a winner.
- Gives a 0-coin player 1 coin when they skip construction.
- Builds the 3rd landmark and sets `game_over` with the active player as winner.

## E2E Tests

- Host creates a room and sees a 5-character room code.
- Second player joins with the room code.
- Host sees both players and can start the game.
- Both browser contexts navigate to the game screen after start.
- The game starts in setup buying, not dice rolling.
- Players complete 3 full setup buying rounds.
- If a setup player cannot afford any visible card, they can take bank coins
  until a setup purchase is possible.
- Normal play begins with the first player.
- Active player rolls dice and both players see the resolving state.
- Active player resolves income and reaches build phase.
- Active player skips construction and both players see the turn advance.

## Docker Smoke Tests

- `docker compose build` builds both development services.
- `docker compose up` starts the client on port `5173` and server on port
  `3001`.
- The browser-facing client connects to the Socket.IO server through
  `http://localhost:3001`.
