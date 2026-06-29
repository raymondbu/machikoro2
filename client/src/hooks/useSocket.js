import { useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export function useSocket() {
  const { setRoom, setGameState, setError, setPlayerId, setRoomRole } = useGameStore();

  useEffect(() => {
    if (socket.connected) {
      setPlayerId(socket.id);
    }

    socket.on('connect', () => {
      setPlayerId(socket.id);
    });

    socket.on('room:update', (room) => {
      if (room.currentPlayerId) {
        setPlayerId(room.currentPlayerId);
      }
      setRoom(room);
    });

    socket.on('game:state', (gameState) => {
      setGameState(gameState);
    });

    socket.on('error', (message) => {
      setError(message);
    });

    return () => {
      socket.off('connect');
      socket.off('room:update');
      socket.off('game:state');
      socket.off('error');
    };
  }, [setRoom, setGameState, setError, setPlayerId]);

  const createRoom = (playerName) => {
    if (socket.id) setPlayerId(socket.id);
    setRoomRole('host');
    socket.emit('room:create', playerName);
  };
  const joinRoom = (roomCode, playerName) => {
    if (socket.id) setPlayerId(socket.id);
    setRoomRole('guest');
    socket.emit('room:join', { roomCode, playerName });
  };
  const startGame = (roomCode) => socket.emit('game:start', roomCode);
  const sendAction = (action) => socket.emit('game:action', action);

  return { createRoom, joinRoom, startGame, sendAction };
}
