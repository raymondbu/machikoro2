import './OpponentSidebar.css';
import { CoinIcon } from '../ui/GameIcons';

export default function OpponentSidebar({ opponents, activePlayerId, isOpen, onToggle }) {
  return (
    <aside className={`opponent-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle opponents sidebar">
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {isOpen && <span>Opponents</span>}
      </button>

      {isOpen && (
        <div className="sidebar-content">
          {opponents.map((player) => (
            <OpponentCard
              key={player.id}
              player={player}
              isActive={player.id === activePlayerId}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function OpponentCard({ player, isActive }) {
  const builtCount = player.landmarks.filter((l) => l.built).length;

  return (
    <div className={`opponent-card ${isActive ? 'active' : ''}`}>
      <div className="opp-header">
        <div className="opp-name-row">
          {isActive && <span className="opp-active-dot" />}
          <span className="opp-name">{player.name}</span>
        </div>
        <div className="opp-coins">
          <CoinIcon className="coin-icon" />
          <span>{player.coins}</span>
        </div>
      </div>

      {/* Landmark progress */}
      <div className="opp-landmarks">
        {player.landmarks.map((lm) => (
          <div
            key={lm.id}
            className={`opp-landmark-dot ${lm.built ? 'built' : ''}`}
            title={lm.name}
          />
        ))}
      </div>
      <div className="opp-landmark-label">
        {builtCount}/3 landmarks
      </div>

      {/* Card count */}
      <div className="opp-card-count">
        {player.establishments.length} establishment{player.establishments.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
