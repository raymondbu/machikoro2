import { useEffect, useState } from 'react';
import './WinScreen.css';
import { CityIcon, CoinIcon, CrownIcon, TrophyIcon } from './GameIcons';

export default function WinScreen({ gameState, playerId, onPlayAgain }) {
  const [visible, setVisible] = useState(false);
  const [confettiStyles, setConfettiStyles] = useState([]);

  const winner = gameState?.players.find((p) => p.id === gameState.winner);
  const isWinner = gameState?.winner === playerId;

  useEffect(() => {
    let isMounted = true;

    if (gameState?.phase === 'game_over') {
      const t = setTimeout(() => {
        if (isMounted) {
          setVisible(true);
          
          if (isWinner) {
            const colors = ['#f0a500', '#34d399', '#60a5fa', '#f87171', '#a78bfa'];
            const generatedStyles = Array.from({ length: 20 }).map((_, i) => ({
              '--delay': `${Math.random() * 0.8}s`,
              '--x': `${Math.random() * 100}%`,
              '--color': colors[i % colors.length],
            }));
            setConfettiStyles(generatedStyles);
          }
        }
      }, 600);
      
      return () => {
        isMounted = false;
        clearTimeout(t);
      };
    }

    // Safely reset state when the phase changes AWAY from game_over 
    // without triggering synchronous cascading render warnings
    return () => {
      setVisible(false);
      setConfettiStyles([]);
    };
  }, [gameState?.phase, isWinner]);

  if (!visible || !winner) return null;

  return (
    <div className="win-overlay">
      <div className={`win-card ${isWinner ? 'winner' : 'loser'}`}>

        {/* Confetti dots */}
        {isWinner && (
          <div className="confetti" aria-hidden="true">
            {confettiStyles.map((styleProps, i) => (
              <span key={i} className="confetti-dot" style={styleProps} />
            ))}
          </div>
        )}

        {/* Icon */}
        <div className="win-icon">
          {isWinner ? <TrophyIcon /> : <CityIcon />}
        </div>

        {/* Headline */}
        <h1 className="win-headline">
          {isWinner ? 'You win!' : `${winner.name} wins!`}
        </h1>
        <p className="win-sub">
          {isWinner
            ? 'Three landmarks built — your city is complete!'
            : `${winner.name} built three landmarks first.`}
        </p>

        {/* Final scores */}
        <div className="win-scores">
          <div className="win-scores-title">Final standings</div>
          {[...gameState.players]
            .sort((a, b) => {
              if (a.id === gameState.winner) return -1;
              if (b.id === gameState.winner) return 1;
              const aLm = a.landmarks.filter(l => l.built).length;
              const bLm = b.landmarks.filter(l => l.built).length;
              if (bLm !== aLm) return bLm - aLm;
              return b.coins - a.coins;
            })
            .map((player, i) => {
              const landmarksBuilt = player.landmarks.filter(l => l.built).length;
              const isThisWinner = player.id === gameState.winner;
              const isYou = player.id === playerId;

              return (
                <div key={player.id} className={`score-row ${isThisWinner ? 'score-winner' : ''}`}>
                  <span className="score-rank">{i + 1}</span>
                  <span className="score-name">
                    {player.name}
                    {isYou && <span className="score-you">you</span>}
                    {isThisWinner && <CrownIcon className="score-crown" />}
                  </span>
                  <span className="score-landmarks">
                    {landmarksBuilt}/3 landmarks
                  </span>
                  <span className="score-coins">
                    <CoinIcon className="coin-icon" />
                    {player.coins}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Actions */}
        <div className="win-actions">
          <button className="win-btn-primary" onClick={onPlayAgain}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
