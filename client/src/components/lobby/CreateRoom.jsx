import { useState } from 'react';
import useGameStore from '../../store/gameStore';

export default function CreateRoom({ onCreateRoom, onStartGame }) {
  const [name, setName] = useState('');
  const [createdRoom, setCreatedRoom] = useState(false);
  const [copied, setCopied] = useState(false);
  const { room, playerId, roomRole } = useGameStore();

  const currentPlayerId = playerId ?? room?.currentPlayerId;
  const isHost = createdRoom
    || roomRole === 'host'
    || room?.players.find((p) => p.id === currentPlayerId)?.host
    || false;
  const canStart = room && room.players.length >= 2 && isHost;

  function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreatedRoom(true);
    onCreateRoom(trimmed);
  }

  async function handleCopyRoomCode() {
    if (!room?.code) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(room.code);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = room.code;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (room) {
    return (
      <div className="card active">
        <div className="card-header">
          <div className="card-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="card-title">Room created</div>
            <div className="card-desc">Share the code below</div>
          </div>
        </div>

        <div className="room-code-box">
          <div className="room-code-label">Room code</div>
          <div className="room-code-row">
            <div className="room-code-value">{room.code}</div>
            <button
              type="button"
              className={`room-code-copy ${copied ? 'copied' : ''}`}
              onClick={handleCopyRoomCode}
              aria-label="Copy room code"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="player-list">
          {room.players.map((player) => (
            <div className="player-item" key={player.id}>
              <div className="player-dot connected" />
              <span>{player.name}</span>
              {player.host && <span className="player-badge">host</span>}
              {player.id === currentPlayerId && !player.host && (
                <span className="player-badge you">you</span>
              )}
            </div>
          ))}
          {room.players.length < 5 && (
            <div className="player-item">
              <div className="player-dot waiting" />
              <span className="muted">Waiting for players…</span>
            </div>
          )}
        </div>

        {isHost && (
          <div className="start-area">
            <button
              className="btn primary"
              onClick={() => {
                console.log('Start clicked, room.code:', room.code);
                onStartGame(room.code);
              }}
              disabled={!canStart}
            >
              Start game
            </button>
            <p className="status-note">
              {canStart
                ? `${room.players.length} players ready — good to go`
                : 'Need at least 2 players to start'}
            </p>
          </div>
        )}

        {!isHost && (
          <p className="status-note">Waiting for the host to start…</p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div>
          <div className="card-title">Create room</div>
          <div className="card-desc">Host a new game</div>
        </div>
      </div>

      <form onSubmit={handleCreate} className="card-form">
        <div className="field">
          <label htmlFor="create-name">Your name</label>
          <input
            id="create-name"
            type="text"
            placeholder="e.g. Jerry"
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn primary" disabled={!name.trim()}>
          Create room
        </button>
      </form>
    </div>
  );
}
