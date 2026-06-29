// GameState.js — authoritative server-side game state for Machi Koro 2

const { ESTABLISHMENTS, LANDMARKS, CARD_COLOR, COPIES_PER_ESTABLISHMENT } = require('./cards');

const PHASE = {
  LOBBY: 'lobby',
  INITIAL_BUILD: 'initial_build',
  ROLL_DICE: 'roll_dice',
  RESOLVE_INCOME: 'resolve_income',
  CONSTRUCT: 'construct',
  GAME_OVER: 'game_over',
};

const MARKET_ROWS = {
  LEVEL_1_TO_6: 'level1to6',
  LEVEL_7_TO_12: 'level7to12',
};

const INITIAL_BUILD_ROUNDS = 3;
const LANDMARKS_TO_WIN = 3;

class GameState {
  constructor(players) {
    // players: [{ id: socketId, name: string }]
    this.phase = PHASE.INITIAL_BUILD;
    this.turn = 0;                  // index into this.players
    this.round = 1;
    this.initialBuildTurnsTaken = 0;
    this.initialBuildRounds = INITIAL_BUILD_ROUNDS;
    this.lastRoll = null;           // { dice: [n, n], total: n, isDoubles: bool }
    this.pendingTarget = null;      // for TV Station / Business Complex
    this.winner = null;
    this.log = [];                  // activity feed entries

    // Build the marketplace decks
    this.decks = this._buildDecks();
    this.marketplace = {
      [MARKET_ROWS.LEVEL_1_TO_6]: this._drawMarketplace(MARKET_ROWS.LEVEL_1_TO_6),
      [MARKET_ROWS.LEVEL_7_TO_12]: this._drawMarketplace(MARKET_ROWS.LEVEL_7_TO_12),
    };

    // Initialise each player
    this.players = players.map((p, index) => ({
      id: p.id,
      name: p.name,
      coins: 5,
      establishments: [],             // cards they've bought
      landmarks: LANDMARKS
        .filter(l => l.id !== 'city_hall')
        .map(l => ({
          ...l,
          built: false,
        })),
      extraTurn: false,               // triggered by Amusement Park doubles
      canReroll: false,               // triggered by Radio Tower (once per turn)
    }));
  }

  // ── Deck / Marketplace ──────────────────────────────────────────────

  _buildDecks() {
    const decks = {
      [MARKET_ROWS.LEVEL_1_TO_6]: [],
      [MARKET_ROWS.LEVEL_7_TO_12]: [],
    };
    for (const card of ESTABLISHMENTS) {
      const rowKey = this._marketRowForCard(card);
      for (let i = 0; i < COPIES_PER_ESTABLISHMENT; i++) {
        decks[rowKey].push({ ...card, uid: `${card.id}_${i}` });
      }
    }
    return {
      [MARKET_ROWS.LEVEL_1_TO_6]: this._shuffle(decks[MARKET_ROWS.LEVEL_1_TO_6]),
      [MARKET_ROWS.LEVEL_7_TO_12]: this._shuffle(decks[MARKET_ROWS.LEVEL_7_TO_12]),
    };
  }

  _drawMarketplace(rowKey) {
    // Draw up to 5 unique establishment types for the face-up market
    const market = [];
    const seenIds = new Set();
    const deck = this.decks[rowKey];
    while (market.length < 5 && deck.length > 0) {
      const card = deck.shift();
      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        market.push(card);
      } else {
        // Put duplicates in a visible "stack" behind the unique face-up card
        const existing = market.find(c => c.id === card.id);
        if (existing) {
          existing.stackCount = (existing.stackCount || 1) + 1;
        }
      }
    }
    return market;
  }

  replenishMarketplace(rowKey) {
    // After a purchase, refill any gaps with new unique card types
    const market = this.marketplace[rowKey];
    const deck = this.decks[rowKey];
    const seenIds = new Set(market.map(c => c.id));
    while (market.length < 5 && deck.length > 0) {
      const card = deck.shift();
      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        market.push(card);
      } else {
        const existing = market.find(c => c.id === card.id);
        if (existing) existing.stackCount = (existing.stackCount || 1) + 1;
      }
    }
  }

  // ── Dice Rolling ────────────────────────────────────────────────────

  rollDice(playerId, numDice = 1) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (this.phase !== PHASE.ROLL_DICE) return { error: 'Cannot roll right now' };
    if (![1, 2].includes(numDice)) return { error: 'Choose 1 or 2 dice' };

    const dice = Array.from({ length: numDice }, () => Math.ceil(Math.random() * 6));
    const total = dice.reduce((a, b) => a + b, 0);
    const isDoubles = numDice === 2 && dice[0] === dice[1];

    // Harbor landmark: if 2 dice rolled and player has harbor built, can add +2
    // (client sends addHarborBonus: true — handled in a separate action)

    this.lastRoll = { dice, total, isDoubles };
    this.phase = PHASE.RESOLVE_INCOME;

    this._addLog(`${this._activePlayer().name} rolled ${dice.join(' + ')} = ${total}`);
    return { dice, total, isDoubles };
  }

  applyHarborBonus(playerId) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    const player = this._activePlayer();
    const hasHarbor = player.landmarks.find(l => l.id === 'harbor')?.built;
    if (!hasHarbor) return { error: 'Harbor not built' };
    this.lastRoll.total += 2;
    this._addLog(`${player.name} used Harbor (+2 → ${this.lastRoll.total})`);
    return { total: this.lastRoll.total };
  }

  rerollDice(playerId, numDice = 1) {
    const player = this._getPlayer(playerId);
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    const hasRadioTower = player.landmarks.find(l => l.id === 'radio_tower')?.built;
    if (!hasRadioTower || !player.canReroll) return { error: 'Cannot reroll' };
    player.canReroll = false;
    return this.rollDice(playerId, numDice);
  }

  // ── Income Resolution ───────────────────────────────────────────────

  resolveIncome() {
    if (this.phase !== PHASE.RESOLVE_INCOME) return { error: 'Wrong phase' };

    const roll = this.lastRoll.total;
    const activePlayer = this._activePlayer();
    const results = [];

    // Resolution order per Machi Koro 2 rules:
    // 1. Red cards (other players, starting from player to left of active)
    // 2. Green + Blue cards (active player only)
    // 3. Purple cards (active player only)

    // 1. RED — players other than active, starting left (next in turn order)
    const others = this._otherPlayersInOrder();
    for (const player of others) {
      for (const card of player.establishments) {
        if (card.color === CARD_COLOR.RED && card.activation.includes(roll)) {
          const amount = Math.min(
            card.income(player, this.players, activePlayer),
            activePlayer.coins
          );
          activePlayer.coins -= amount;
          player.coins += amount;
          // Shopping Mall bonus doesn't apply to red cards
          results.push({ player: player.name, card: card.name, coins: amount });
          this._addLog(`${player.name}'s ${card.name} activated — took ${amount} coin(s) from ${activePlayer.name}`);
        }
      }
    }

    // 2. GREEN + BLUE — active player
    for (const card of activePlayer.establishments) {
      if (
        (card.color === CARD_COLOR.GREEN || card.color === CARD_COLOR.BLUE) &&
        card.activation.includes(roll)
      ) {
        let amount = card.income(activePlayer, this.players, activePlayer);
        // Shopping Mall: +1 for cup and bread establishments
        const hasMall = activePlayer.landmarks.find(l => l.id === 'shopping_mall')?.built;
        if (hasMall && (card.type === 'cup' || card.type === 'bread')) amount += 1;
        activePlayer.coins += amount;
        results.push({ player: activePlayer.name, card: card.name, coins: amount });
        this._addLog(`${activePlayer.name}'s ${card.name} activated — earned ${amount} coin(s)`);
      }
    }

    // 3. BLUE cards owned by OTHER players also activate for them
    for (const player of others) {
      for (const card of player.establishments) {
        if (card.color === CARD_COLOR.BLUE && card.activation.includes(roll)) {
          const amount = card.income(player, this.players, activePlayer);
          player.coins += amount;
          results.push({ player: player.name, card: card.name, coins: amount });
          this._addLog(`${player.name}'s ${card.name} activated — earned ${amount} coin(s)`);
        }
      }
    }

    // 4. PURPLE — active player only
    for (const card of activePlayer.establishments) {
      if (card.color === CARD_COLOR.PURPLE && card.activation.includes(roll)) {
        if (card.requiresTarget) {
          // Pause resolution — client must send a target choice
          this.pendingTarget = { cardId: card.id };
          this._addLog(`${activePlayer.name}'s ${card.name} activated — choose a target`);
          this.phase = PHASE.RESOLVE_INCOME; // stay in phase until target chosen
          return { results, pendingTarget: this.pendingTarget };
        }

        const amount = card.income(activePlayer, this.players, activePlayer);

        if (card.id === 'stadium') {
          for (const player of others) {
            const taken = Math.min(2, player.coins);
            player.coins -= taken;
            activePlayer.coins += taken;
          }
          this._addLog(`${activePlayer.name}'s Stadium activated — took 2 coins from each player`);
        } else if (card.id === 'publisher') {
          for (const player of others) {
            const count = player.establishments.filter(
              e => e.type === 'cup' || e.type === 'bread'
            ).length;
            const taken = Math.min(count, player.coins);
            player.coins -= taken;
            activePlayer.coins += taken;
          }
          this._addLog(`${activePlayer.name}'s Publisher activated`);
        } else if (card.id === 'tax_office') {
          for (const player of others) {
            if (player.coins >= 10) {
              const taken = Math.floor(player.coins / 2);
              player.coins -= taken;
              activePlayer.coins += taken;
            }
          }
          this._addLog(`${activePlayer.name}'s Tax Office activated`);
        }

        results.push({ player: activePlayer.name, card: card.name, coins: amount });
      }
    }

    this.phase = PHASE.CONSTRUCT;
    return { results };
  }

  resolvePurpleTarget(playerId, targetPlayerId, swapCardUid = null) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (!this.pendingTarget) return { error: 'No pending target' };

    const activePlayer = this._activePlayer();
    const targetPlayer = this._getPlayer(targetPlayerId);
    if (!targetPlayer) return { error: 'Target player not found' };

    if (this.pendingTarget.cardId === 'tv_station') {
      const taken = Math.min(5, targetPlayer.coins);
      targetPlayer.coins -= taken;
      activePlayer.coins += taken;
      this._addLog(`${activePlayer.name}'s TV Station took ${taken} coins from ${targetPlayer.name}`);
    }

    if (this.pendingTarget.cardId === 'business_complex' && swapCardUid) {
      const targetCardIndex = targetPlayer.establishments.findIndex(e => e.uid === swapCardUid);
      if (targetCardIndex === -1) return { error: 'Card not found on target player' };
      // Swap: active player gives their last-bought non-purple card
      const activeCardIndex = activePlayer.establishments.findLastIndex(
        e => e.color !== CARD_COLOR.PURPLE
      );
      if (activeCardIndex === -1) return { error: 'No swappable card' };
      const [activeCard] = activePlayer.establishments.splice(activeCardIndex, 1);
      const [targetCard] = targetPlayer.establishments.splice(targetCardIndex, 1);
      activePlayer.establishments.push(targetCard);
      targetPlayer.establishments.push(activeCard);
      this._addLog(`${activePlayer.name} swapped ${activeCard.name} for ${targetPlayer.name}'s ${targetCard.name}`);
    }

    this.pendingTarget = null;
    this.phase = PHASE.CONSTRUCT;
    return { success: true };
  }

  // ── Construction ────────────────────────────────────────────────────

  buyEstablishment(playerId, marketplaceCardUid) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (![PHASE.INITIAL_BUILD, PHASE.CONSTRUCT].includes(this.phase)) {
      return { error: 'Cannot build right now' };
    }

    const player = this._activePlayer();
    const marketMatch = this._findMarketplaceCard(marketplaceCardUid);
    if (!marketMatch) return { error: 'Card not in marketplace' };

    const { rowKey, card, cardIndex } = marketMatch;
    if (player.coins < card.cost) return { error: 'Not enough coins' };

    // Purple cards: can only own one of each
    if (card.color === CARD_COLOR.PURPLE) {
      const alreadyOwns = player.establishments.some(e => e.id === card.id);
      if (alreadyOwns) return { error: 'Already own this major establishment' };
    }

    player.coins -= card.cost;
    player.establishments.push(card);

    // Remove from marketplace (or decrement stack)
    if (card.stackCount && card.stackCount > 1) {
      this.marketplace[rowKey][cardIndex].stackCount -= 1;
    } else {
      this.marketplace[rowKey].splice(cardIndex, 1);
      this.replenishMarketplace(rowKey);
    }

    this._addLog(`${player.name} bought ${card.name} for ${card.cost} coin(s)`);
    if (this.phase === PHASE.INITIAL_BUILD) {
      this._endInitialBuildTurn();
      return { success: true };
    }

    this._endTurn();
    return { success: true };
  }

  buildLandmark(playerId, landmarkId) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (this.phase !== PHASE.CONSTRUCT) return { error: 'Cannot build right now' };

    const player = this._activePlayer();
    const landmark = player.landmarks.find(l => l.id === landmarkId);
    if (!landmark) return { error: 'Landmark not found' };
    if (landmark.built) return { error: 'Already built' };
    if (player.coins < landmark.cost) return { error: 'Not enough coins' };

    player.coins -= landmark.cost;
    landmark.built = true;

    this._addLog(`${player.name} built ${landmark.name}!`);

    // Check win condition
    const builtLandmarks = player.landmarks.filter(l => l.built).length;
    if (builtLandmarks >= LANDMARKS_TO_WIN) {
      this.phase = PHASE.GAME_OVER;
      this.winner = player.id;
      this._addLog(`🎉 ${player.name} wins!`);
      return { success: true, winner: player.id };
    }

    this._endTurn();
    return { success: true };
  }

  skipConstruction(playerId) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (this.phase !== PHASE.CONSTRUCT) return { error: 'Cannot skip right now' };

    const player = this._activePlayer();

    // Airport: get 10 coins if choosing not to build
    const hasAirport = player.landmarks.find(l => l.id === 'airport')?.built;
    if (hasAirport) {
      player.coins += 10;
      this._addLog(`${player.name} skipped construction — Airport bonus: +10 coins`);
    } else if (player.coins === 0) {
      player.coins += 1;
      this._addLog(`${player.name} skipped construction with 0 coins — bank gives 1 coin`);
    } else {
      this._addLog(`${player.name} skipped construction`);
    }

    this._endTurn();
    return { success: true };
  }

  takeSetupCoin(playerId) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (this.phase !== PHASE.INITIAL_BUILD) return { error: 'Cannot take setup coin right now' };

    const player = this._activePlayer();
    if (this._canAffordVisibleEstablishment(player)) {
      return { error: 'You can afford a market card' };
    }

    player.coins += 1;
    this._addLog(`${player.name} could not afford a setup card - bank gives 1 coin`);
    return { success: true };
  }

  // ── Turn Management ─────────────────────────────────────────────────

  _endTurn() {
    const player = this._activePlayer();

    // Amusement Park: extra turn on doubles
    if (player.extraTurn) {
      player.extraTurn = false;
      this._addLog(`${player.name} gets an extra turn (Amusement Park)`);
    } else {
      this.turn = (this.turn + 1) % this.players.length;
      if (this.turn === 0) this.round++;
    }

    const nextPlayer = this._activePlayer();

    // Reset per-turn flags
    nextPlayer.canReroll = false;

    // Radio Tower reset for next player
    const hasRadioTower = nextPlayer.landmarks.find(l => l.id === 'radio_tower')?.built;
    if (hasRadioTower) nextPlayer.canReroll = true;

    // Amusement Park: flag extra turn if last roll was doubles
    const hasAmusementPark = nextPlayer.landmarks.find(l => l.id === 'amusement_park')?.built;
    if (hasAmusementPark && this.lastRoll?.isDoubles) {
      nextPlayer.extraTurn = true;
    }

    this.lastRoll = null;
    this.phase = PHASE.ROLL_DICE;
    this._addLog(`--- ${nextPlayer.name}'s turn (Round ${this.round}) ---`);
  }

  // Called after construction phase (buy or skip both call _endTurn internally)
  endConstructionPhase(playerId) {
    if (!this._isActivePlayer(playerId)) return { error: 'Not your turn' };
    if (this.phase !== PHASE.CONSTRUCT) return { error: 'Wrong phase' };
    this._endTurn();
    return { success: true };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  _endInitialBuildTurn() {
    this.initialBuildTurnsTaken++;

    const totalInitialBuildTurns = this.players.length * this.initialBuildRounds;
    if (this.initialBuildTurnsTaken >= totalInitialBuildTurns) {
      this.turn = 0;
      this.round = 1;
      this.phase = PHASE.ROLL_DICE;
      this._addLog(`--- ${this._activePlayer().name}'s turn (Round ${this.round}) ---`);
      return;
    }

    this.turn = (this.turn + 1) % this.players.length;
    this._addLog(`--- Setup buy ${this.initialBuildRound}/3: ${this._activePlayer().name}'s turn ---`);
  }

  _marketRowForCard(card) {
    return Math.max(...card.activation) <= 6
      ? MARKET_ROWS.LEVEL_1_TO_6
      : MARKET_ROWS.LEVEL_7_TO_12;
  }

  _findMarketplaceCard(cardUid) {
    for (const rowKey of Object.values(MARKET_ROWS)) {
      const cardIndex = this.marketplace[rowKey].findIndex(c => c.uid === cardUid);
      if (cardIndex !== -1) {
        return { rowKey, card: this.marketplace[rowKey][cardIndex], cardIndex };
      }
    }
    return null;
  }

  _visibleMarketplaceCards() {
    return Object.values(MARKET_ROWS).flatMap(rowKey => this.marketplace[rowKey] || []);
  }

  _canAffordVisibleEstablishment(player) {
    return this._visibleMarketplaceCards().some(card => player.coins >= card.cost);
  }

  get initialBuildRound() {
    if (this.phase !== PHASE.INITIAL_BUILD) return this.initialBuildRounds;
    return Math.floor(this.initialBuildTurnsTaken / this.players.length) + 1;
  }

  _activePlayer() {
    return this.players[this.turn];
  }

  _isActivePlayer(playerId) {
    return this._activePlayer().id === playerId;
  }

  _getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  _otherPlayersInOrder() {
    // Returns players starting from the one to the left of active
    const len = this.players.length;
    const result = [];
    for (let i = 1; i < len; i++) {
      result.push(this.players[(this.turn + i) % len]);
    }
    return result;
  }

  _addLog(message) {
    this.log.push({ message, timestamp: Date.now() });
    if (this.log.length > 100) this.log.shift(); // keep log bounded
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Serialise to send to clients (strip income functions — not serialisable)
  toJSON() {
    return {
      phase: this.phase,
      turn: this.turn,
      round: this.round,
      initialBuildRound: this.initialBuildRound,
      initialBuildRounds: this.initialBuildRounds,
      initialBuildTurnsTaken: this.initialBuildTurnsTaken,
      lastRoll: this.lastRoll,
      pendingTarget: this.pendingTarget,
      winner: this.winner,
      deckCount: {
        [MARKET_ROWS.LEVEL_1_TO_6]: this.decks[MARKET_ROWS.LEVEL_1_TO_6].length,
        [MARKET_ROWS.LEVEL_7_TO_12]: this.decks[MARKET_ROWS.LEVEL_7_TO_12].length,
      },
      marketplace: {
        [MARKET_ROWS.LEVEL_1_TO_6]: this.marketplace[MARKET_ROWS.LEVEL_1_TO_6].map(({ income, ...rest }) => rest),
        [MARKET_ROWS.LEVEL_7_TO_12]: this.marketplace[MARKET_ROWS.LEVEL_7_TO_12].map(({ income, ...rest }) => rest),
      },
      players: this.players.map(p => ({
        ...p,
        establishments: p.establishments.map(({ income, ...rest }) => rest),
      })),
      log: this.log.slice(-20), // last 20 entries
    };
  }
}

module.exports = { GameState, PHASE };
