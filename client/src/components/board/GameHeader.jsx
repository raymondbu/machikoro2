import './GameHeader.css';
import { CoinIcon } from '../ui/GameIcons';

export default function GameHeader({
  gameState,
  me,
  activePlayer,
  isMyTurn,
  logOpen,
  onToggleLog,
}) {
  const roundLabel = gameState.phase === 'initial_build'
    ? `Setup ${gameState.initialBuildRound ?? 1}/${gameState.initialBuildRounds ?? 3}`
    : `Round ${gameState.round}`;

  return (
    <header className="game-header">
      <div className="header-left">
        <span className="header-round">{roundLabel}</span>
        <span className="header-divider">·</span>
        <span className={`header-turn ${isMyTurn ? 'my-turn' : ''}`}>
          {isMyTurn ? 'Your turn' : `${activePlayer?.name}'s turn`}
        </span>
      </div>

      <div className="header-center">
        <PhaseBadge phase={gameState.phase} />
      </div>

      <div className="header-right">
        <div className="coin-display">
          <CoinIcon className="coin-icon" />
          <span className="coin-count">{me?.coins ?? 0}</span>
        </div>
        <button
          className={`log-toggle ${logOpen ? 'active' : ''}`}
          onClick={onToggleLog}
          aria-label="Toggle game log"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Log
        </button>
      </div>
    </header>
  );
}

function PhaseBadge({ phase }) {
  const labels = {
    initial_build:  { text: 'Setup buying', color: '#a78bfa' },
    roll_dice:      { text: 'Roll dice', color: '#60a5fa' },
    resolve_income: { text: 'Resolving...', color: '#f59e0b' },
    construct:      { text: 'Build phase', color: '#34d399' },
    game_over:      { text: 'Game over', color: '#f0a500' },
  };
  const { text, color } = labels[phase] ?? { text: phase, color: '#9ca3af' };

  return (
    <span className="phase-badge" style={{ '--phase-color': color }}>
      {text}
    </span>
  );
}
