# Machi Koro 2 Game Rules

This document is the project source of truth for automated tests. It describes
the rules implemented by this app, adapted to the current card data.

## Players And Rooms

- A room can contain 2 to 5 players.
- The first player to create a room is the host.
- Only the host can start a game.
- A game cannot start with fewer than 2 players.
- The server is authoritative for room state, game state, and turn order.

## Starting State

- Each player starts with 5 coins.
- Each player starts with no establishments.
- Each player starts with no built landmarks.
- The marketplace has two establishment rows:
  - Level 1-6 establishments.
  - Level 7-12 establishments.
- Each market row starts with up to 5 visible establishment types.
- Duplicate visible cards are stacked behind the matching visible type.

## Initial Building Phase

Before normal turns begin, the game starts in `initial_build`.

- There is no dice rolling or income resolution during `initial_build`.
- Each player buys one visible establishment on their setup turn.
- If the active setup player cannot afford any visible establishment, they may
  take 1 coin from the bank. Their setup turn does not advance until they buy.
- Setup buying continues for 3 full table rounds.
- After the last setup purchase, normal play begins in `roll_dice` with the
  first player in the room.

For example, a 2-player game has 6 setup purchases total.

## Normal Turn Flow

Each normal turn follows this sequence:

1. Roll dice.
2. Resolve income for the roll.
3. Construct one item or skip construction.
4. Advance to the next player unless the game is over or an extra turn applies.

Only the active player can take turn actions.

## Dice

- The active player may choose to roll 1 or 2 dice.
- If 2 dice are rolled, their values are added.
- Dice results move the game from `roll_dice` to `resolve_income`.
- A player with Harbor built may add 2 to a two-dice roll.
- A player with Radio Tower built may reroll once on their turn.
- A player with Amusement Park built gets an extra turn after rolling doubles.

## Income Resolution

Income resolves in this order:

1. Red establishments owned by non-active players collect from the active player.
2. Blue and green establishments pay eligible owners.
3. Purple establishments owned by the active player resolve last.

The active player cannot pay more coins than they have when a red establishment
collects from them.

If a purple establishment needs a target, income resolution pauses until the
active player chooses the target.

## Construction

During `construct`, the active player may do one of these:

- Buy one visible establishment they can afford.
- Build one unbuilt landmark they can afford.
- Skip construction.

Buying an establishment or building a landmark completes the construction phase.
If the game is not over, the turn advances after the construction action.

If a player has 0 coins and skips construction without building, the bank gives
them 1 coin.

## Marketplace

- Buying an establishment removes one copy from its marketplace row.
- If a visible card has a stack count greater than 1, the stack count decreases.
- If a visible card is removed, that marketplace row is replenished from its
  matching deck.
- Purple establishments are unique per player; a player cannot own two copies of
  the same purple establishment.

## Win Condition

- A player wins immediately when they build their 3rd landmark.
- Building a 1st or 2nd landmark does not end the game.
- Building the 3rd landmark sets the phase to `game_over` and records the
  winner.
