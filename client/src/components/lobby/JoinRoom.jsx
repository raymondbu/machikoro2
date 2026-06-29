import { useState } from 'react';
import useGameStore from '../../store/gameStore';

export default function JoinRoom({ onJoinRoom }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { room, playerId, roomRole } = useGameStore();

  // Check if this player has joined a room (but didn't create it)
  const currentPlayerId = playerId ?? room?.currentPlayerId;
  const currentPlayer = room?.players.find((p) => p.id === currentPlayerId);
  const hasJoined = room && (
    roomRole === 'guest'
    || (currentPlayer && !currentPlayer.host)
  );

  function handleJoin(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || trimmedCode.length !== 5) return;
    onJoinRoom(trimmedCode, trimmedName);
  }

  if (hasJoined) {
    return (
      <div className="card active">
        <div className="card-header">
          <div className="card-icon success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div className="card-title">Joined room</div>
            <div className="card-desc">Room {room.code}</div>
          </div>
        </div>

        {/* Player list */}
        <div className="player-list">
          {room.players.map((player) => (
            <div className="player-item" key={player.id}>
              <div className="player-dot connected" />
              <span>{player.name}</span>
              {player.host && <span className="player-badge">host</span>}
              {player.id === currentPlayerId && (
                <span className="player-badge you">you</span>
              )}
            </div>
          ))}
        </div>

        <p className="status-note">Waiting for the host to start the game…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <div>
          <div className="card-title">Join room</div>
          <div className="card-desc">Enter a room code</div>
        </div>
      </div>

      <form onSubmit={handleJoin} className="card-form">
        <div className="field">
          <label htmlFor="join-name">Your name</label>
          <input
            id="join-name"
            type="text"
            placeholder="e.g. Alex"
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="join-code">Room code</label>
          <input
            id="join-code"
            type="text"
            placeholder="XXXXX"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mono"
            autoComplete="off"
            autoCapitalize="characters"
          />
        </div>

        <button
          type="submit"
          className="btn"
          disabled={!name.trim() || code.trim().length !== 5}
        >
          Join room
        </button>
      </form>
    </div>
  );
}
