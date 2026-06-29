const assert = require('node:assert/strict');
const test = require('node:test');
const { GameState, PHASE } = require('../src/game/GameState');
const { ESTABLISHMENTS } = require('../src/game/cards');

function players(count = 2) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
  }));
}

function card(id, uid = `${id}_test`) {
  const template = ESTABLISHMENTS.find((entry) => entry.id === id);
  assert.ok(template, `Expected card ${id} to exist`);
  return { ...template, uid };
}

test('initializes players, coins, landmarks, and marketplace rows', () => {
  const game = new GameState(players(5));

  assert.equal(game.players.length, 5);
  assert.equal(game.phase, PHASE.INITIAL_BUILD);
  assert.equal(game.turn, 0);
  assert.equal(game.marketplace.level1to6.length, 5);
  assert.equal(game.marketplace.level7to12.length, 5);
  assert.equal(game.initialBuildRound, 1);

  for (const player of game.players) {
    assert.equal(player.coins, 5);
    assert.equal(player.establishments.length, 0);
    assert.equal(player.landmarks.find((landmark) => landmark.id === 'city_hall'), undefined);
    assert.equal(player.landmarks.find((landmark) => landmark.id === 'harbor')?.built, false);
  }
});

test('rejects dice rolls during the initial build phase', () => {
  const game = new GameState(players());

  const result = game.rollDice('p1');

  assert.equal(result.error, 'Cannot roll right now');
  assert.equal(game.phase, PHASE.INITIAL_BUILD);
});

test('initial build purchases advance through three full table rounds', () => {
  const game = new GameState(players());
  const bakery = { ...card('bakery', 'bakery_setup'), stackCount: 6 };
  game.marketplace = { level1to6: [bakery], level7to12: [] };
  game.decks = { level1to6: [], level7to12: [] };

  for (const player of game.players) player.coins = 10;

  for (let i = 0; i < 5; i++) {
    const activePlayerId = game.players[game.turn].id;
    const result = game.buyEstablishment(activePlayerId, bakery.uid);
    assert.equal(result.error, undefined);
    assert.equal(game.phase, PHASE.INITIAL_BUILD);
  }

  const finalPlayerId = game.players[game.turn].id;
  const finalResult = game.buyEstablishment(finalPlayerId, bakery.uid);

  assert.equal(finalResult.error, undefined);
  assert.equal(game.initialBuildTurnsTaken, 6);
  assert.equal(game.phase, PHASE.ROLL_DICE);
  assert.equal(game.turn, 0);
  assert.equal(game.players[0].establishments.length, 3);
  assert.equal(game.players[1].establishments.length, 3);
});

test('setup player can take 1 coin when no visible establishment is affordable', () => {
  const game = new GameState(players());
  const bakery = card('bakery', 'bakery_setup_coin');
  game.marketplace = { level1to6: [bakery], level7to12: [] };
  game.decks = { level1to6: [], level7to12: [] };
  game.players[0].coins = 0;

  const result = game.takeSetupCoin('p1');

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].coins, 1);
  assert.equal(game.turn, 0);
  assert.equal(game.phase, PHASE.INITIAL_BUILD);
});

test('setup coin is rejected while the active player can afford a visible establishment', () => {
  const game = new GameState(players());
  const bakery = card('bakery', 'bakery_setup_affordable');
  game.marketplace = { level1to6: [bakery], level7to12: [] };
  game.decks = { level1to6: [], level7to12: [] };
  game.players[0].coins = 1;

  const result = game.takeSetupCoin('p1');

  assert.equal(result.error, 'You can afford a market card');
  assert.equal(game.players[0].coins, 1);
  assert.equal(game.turn, 0);
  assert.equal(game.phase, PHASE.INITIAL_BUILD);
});

test('rejects dice rolls from non-active players', () => {
  const game = new GameState(players());
  game.phase = PHASE.ROLL_DICE;

  const result = game.rollDice('p2');

  assert.equal(result.error, 'Not your turn');
  assert.equal(game.phase, PHASE.ROLL_DICE);
});

test('active player rolls and moves to resolve income', () => {
  const game = new GameState(players());
  game.phase = PHASE.ROLL_DICE;

  const result = game.rollDice('p1');

  assert.equal(result.error, undefined);
  assert.equal(result.dice.length, 1);
  assert.equal(game.phase, PHASE.RESOLVE_INCOME);
  assert.equal(game.lastRoll.total, result.total);
});

test('active player may roll two dice', () => {
  const game = new GameState(players());
  game.phase = PHASE.ROLL_DICE;

  const result = game.rollDice('p1', 2);

  assert.equal(result.error, undefined);
  assert.equal(result.dice.length, 2);
  assert.equal(game.phase, PHASE.RESOLVE_INCOME);
});

test('resolves active player income and moves to construction', () => {
  const game = new GameState(players());
  game.players[0].establishments.push(card('bakery'));
  game.lastRoll = { dice: [2], total: 2, isDoubles: false };
  game.phase = PHASE.RESOLVE_INCOME;

  const result = game.resolveIncome();

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].coins, 6);
  assert.equal(game.phase, PHASE.CONSTRUCT);
});

test('red cards resolve before active player income', () => {
  const game = new GameState(players());
  game.players[0].coins = 0;
  game.players[0].establishments.push(card('bakery'));
  game.players[1].establishments.push(card('cafe'));
  game.lastRoll = { dice: [3], total: 3, isDoubles: false };
  game.phase = PHASE.RESOLVE_INCOME;

  const result = game.resolveIncome();

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].coins, 1);
  assert.equal(game.players[1].coins, 5);
  assert.equal(game.phase, PHASE.CONSTRUCT);
});

test('red card collection never takes more coins than the active player has', () => {
  const game = new GameState(players());
  game.players[0].coins = 0;
  game.players[1].establishments.push(card('cafe'));
  game.lastRoll = { dice: [3], total: 3, isDoubles: false };
  game.phase = PHASE.RESOLVE_INCOME;

  const result = game.resolveIncome();

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].coins, 0);
  assert.equal(game.players[1].coins, 5);
  assert.equal(game.phase, PHASE.CONSTRUCT);
});

test('purple target cards pause income until target is resolved', () => {
  const game = new GameState(players());
  game.players[0].establishments.push(card('tv_station'));
  game.lastRoll = { dice: [6], total: 6, isDoubles: false };
  game.phase = PHASE.RESOLVE_INCOME;

  const incomeResult = game.resolveIncome();

  assert.deepEqual(incomeResult.pendingTarget, { cardId: 'tv_station' });
  assert.deepEqual(game.pendingTarget, { cardId: 'tv_station' });
  assert.equal(game.phase, PHASE.RESOLVE_INCOME);

  const targetResult = game.resolvePurpleTarget('p1', 'p2');

  assert.equal(targetResult.error, undefined);
  assert.equal(game.pendingTarget, null);
  assert.equal(game.players[0].coins, 10);
  assert.equal(game.players[1].coins, 0);
  assert.equal(game.phase, PHASE.CONSTRUCT);
});

test('buying an establishment spends coins, updates marketplace, and advances turn', () => {
  const game = new GameState(players());
  const bakery = card('bakery', 'bakery_buy');
  game.phase = PHASE.CONSTRUCT;
  game.players[0].coins = 3;
  game.marketplace = { level1to6: [bakery], level7to12: [] };
  game.decks = { level1to6: [], level7to12: [] };

  const result = game.buyEstablishment('p1', bakery.uid);

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].coins, 2);
  assert.equal(game.players[0].establishments.length, 1);
  assert.equal(game.players[0].establishments[0].id, 'bakery');
  assert.equal(game.marketplace.level1to6.length, 0);
  assert.equal(game.turn, 1);
  assert.equal(game.phase, PHASE.ROLL_DICE);
});

test('building a non-final landmark advances turn without ending the game', () => {
  const game = new GameState(players());
  game.phase = PHASE.CONSTRUCT;
  game.players[0].coins = 10;

  const result = game.buildLandmark('p1', 'harbor');

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].landmarks.find((landmark) => landmark.id === 'harbor')?.built, true);
  assert.equal(game.winner, null);
  assert.equal(game.phase, PHASE.ROLL_DICE);
  assert.equal(game.turn, 1);
});

test('skipping construction with no coins grants 1 coin', () => {
  const game = new GameState(players());
  game.phase = PHASE.CONSTRUCT;
  game.players[0].coins = 0;

  const result = game.skipConstruction('p1');

  assert.equal(result.error, undefined);
  assert.equal(game.players[0].coins, 1);
  assert.equal(game.turn, 1);
  assert.equal(game.phase, PHASE.ROLL_DICE);
});

test('building the third landmark ends the game with a winner', () => {
  const game = new GameState(players());
  game.phase = PHASE.CONSTRUCT;
  game.players[0].coins = 100;

  game.players[0].landmarks.find((landmark) => landmark.id === 'harbor').built = true;
  game.players[0].landmarks.find((landmark) => landmark.id === 'train_station').built = true;

  const result = game.buildLandmark('p1', 'shopping_mall');

  assert.equal(result.error, undefined);
  assert.equal(result.winner, 'p1');
  assert.equal(game.winner, 'p1');
  assert.equal(game.phase, PHASE.GAME_OVER);
  assert.equal(game.turn, 0);
});
