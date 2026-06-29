import { create } from 'zustand';

const useGameStore = create((set) => ({
  playerName: '',
  playerId: null,
  roomRole: null,
  room: null,
  gameState: null,
  error: null,

  setPlayerName: (name) => set({ playerName: name }),
  setPlayerId: (id) => set({ playerId: id }),
  setRoomRole: (roomRole) => set({ roomRole }),
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set({ roomRole: null, room: null, gameState: null, error: null }),
}));

export default useGameStore;
