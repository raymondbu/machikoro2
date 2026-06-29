import { useState } from 'react';
import './ActionBar.css';
import { CoinIcon } from '../ui/GameIcons';

export default function ActionBar({ gameState, me, isMyTurn, onAction }) {
  const [rolling, setRolling] = useState(false);
  const [numDice, setNumDice] = useState(1);

  const { phase, lastRoll, pendingTarget } = gameState;
  const hasHarbor = me?.landmarks.find((l) => l.id === 'harbor')?.built;
  const hasRadioTower = me?.landmarks.find((l) => l.id === 'radio_tower')?.built;
  const visibleMarketCards = Object.values(gameState.marketplace ?? {}).flat();
  const canAffordSetupCard = visibleMarketCards.some((card) => (me?.coins ?? 0) >= card.cost);

  function handleRoll() {
    setRolling(true);
    onAction({ type: 'roll_dice', numDice });
    setTimeout(() => setRolling(false), 600);
  }

  function handleReroll() {
    setRolling(true);
    onAction({ type: 'reroll_dice', numDice });
    setTimeout(() => setRolling(false), 600);
  }

  if (isMyTurn && phase === 'initial_build') {
    return (
      <div className="action-bar">
        <span className="action-hint">
          Setup buy {gameState.initialBuildRound ?? 1}/{gameState.initialBuildRounds ?? 3}
        </span>
        {!canAffordSetupCard && (
          <button
            className="action-secondary"
            onClick={() => onAction({ type: 'take_setup_coin' })}
          >
            Take 1 coin <CoinIcon className="coin-icon" />
          </button>
        )}
      </div>
    );
  }

  // ── Roll phase ────────────────────────────────────────────────────
  if (isMyTurn && phase === 'roll_dice') {
    return (
      <div className="action-bar">
        <div className="dice-toggle">
          <button
            className={`dice-btn ${numDice === 1 ? 'active' : ''}`}
            onClick={() => setNumDice(1)}
          >
            1 die
          </button>
          <button
            className={`dice-btn ${numDice === 2 ? 'active' : ''}`}
            onClick={() => setNumDice(2)}
          >
            2 dice
          </button>
        </div>
        <button
          className={`action-primary ${rolling ? 'rolling' : ''}`}
          onClick={handleRoll}
          disabled={rolling}
        >
          {rolling ? (
            <DiceSpinner />
          ) : (
            <>
              <DiceIcon /> Roll {numDice === 2 ? '2 dice' : '1 die'}
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Resolve phase — show last roll result + optional harbor/reroll ─
  if (phase === 'resolve_income') {
    return (
      <div className="action-bar">
        {lastRoll && (
          <div className="roll-result">
            {lastRoll.dice.map((d, i) => (
              <DiceFace key={i} value={d} />
            ))}
            <span className="roll-total">= {lastRoll.total}</span>
            {lastRoll.isDoubles && (
              <span className="doubles-badge">Doubles!</span>
            )}
          </div>
        )}

        <div className="action-group">
          {isMyTurn && hasHarbor && lastRoll?.dice.length === 2 && (
            <button
              className="action-secondary"
              onClick={() => onAction({ type: 'apply_harbor_bonus' })}
            >
              +2 Harbor bonus
            </button>
          )}
          {isMyTurn && hasRadioTower && me?.canReroll && (
            <button className="action-secondary" onClick={handleReroll}>
              Reroll (Radio Tower)
            </button>
          )}
          {isMyTurn && !pendingTarget && (
            <button
              className="action-primary"
              onClick={() => onAction({ type: 'resolve_income' })}
            >
              Resolve income
            </button>
          )}
          {pendingTarget && isMyTurn && (
            <span className="pending-note">
              Choose a target player for {pendingTarget.cardId.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Construct phase ───────────────────────────────────────────────
  if (isMyTurn && phase === 'construct') {
    return (
      <div className="action-bar">
        <span className="action-hint">
          Buy a card from the marketplace, build a landmark, or skip.
        </span>
        <div className="action-group">
          {/* Unbuilt landmarks the player can afford */}
          {me?.landmarks
            .filter((l) => !l.built && me.coins >= l.cost)
            .map((lm) => (
              <button
                key={lm.id}
                className="action-secondary"
                onClick={() => onAction({ type: 'build_landmark', landmarkId: lm.id })}
              >
                Build {lm.name} <CoinIcon className="coin-icon" />{lm.cost}
              </button>
            ))}
          <button
            className="action-skip"
            onClick={() => onAction({ type: 'skip_construction' })}
          >
            Skip / End turn
          </button>
        </div>
      </div>
    );
  }

  // ── Not your turn ─────────────────────────────────────────────────
  if (!isMyTurn) {
    return (
      <div className="action-bar waiting">
        <span className="waiting-text">
          Waiting for {gameState.players[gameState.turn]?.name}…
        </span>
        {lastRoll && (
          <div className="roll-result">
            {lastRoll.dice.map((d, i) => (
              <DiceFace key={i} value={d} />
            ))}
            <span className="roll-total">= {lastRoll.total}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Game over ─────────────────────────────────────────────────────
  if (phase === 'game_over') {
    const winner = gameState.players.find((p) => p.id === gameState.winner);
    return (
      <div className="action-bar game-over">
        <span className="game-over-text">
          {winner?.name ?? 'Someone'} wins!
        </span>
      </div>
    );
  }

  return null;
}

// ── Small helpers ──────────────────────────────────────────────────

function DiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DiceSpinner() {
  return <DiceFace value={5} spinning />;
}

function DiceFace({ value, spinning = false }) {
  const pips = {
    1: ['center'],
    2: ['top-right', 'bottom-left'],
    3: ['top-right', 'center', 'bottom-left'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right'],
  };

  return (
    <span className={`dice-face ${spinning ? 'dice-spinner' : ''}`} aria-label={`die ${value}`}>
      {(pips[value] ?? []).map((pos) => (
        <span key={pos} className={`dice-pip dice-pip-${pos}`} />
      ))}
    </span>
  );
}
