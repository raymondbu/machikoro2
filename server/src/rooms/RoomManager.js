const { GameState } = require('../game/GameState');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = {};
  }

  createRoom(socket, playerName) {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.rooms[roomCode] = {
      code: roomCode,
      players: [{ id: socket.id, name: playerName, host: true }],
      gameState: null,
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.emit('room:update', this._roomView(this.rooms[roomCode], socket.id));
    console.log(`Room ${roomCode} created by ${playerName}`);
  }

  joinRoom(socket, roomCode, playerName) {
    const room = this.rooms[roomCode];
    if (!room) return socket.emit('error', 'Room not found');
    if (room.gameState) return socket.emit('error', 'Game already started');
    if (room.players.length >= 5) return socket.emit('error', 'Room is full');

    room.players.push({ id: socket.id, name: playerName, host: false });
    socket.join(roomCode);
    socket.roomCode = roomCode;
    this._emitRoomUpdate(roomCode);
    console.log(`${playerName} joined room ${roomCode}`);
  }

  async startGame(socket, roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return socket.emit('error', 'Room not found');

    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.host) return socket.emit('error', 'Only the host can start');
    if (room.players.length < 2) return socket.emit('error', 'Need at least 2 players');

    room.gameState = new GameState(room.players);

    console.log(`emitting game:state to room: ${roomCode}`);
    const socketsInRoom = await this.io.in(roomCode).fetchSockets();
    console.log('sockets in room:', socketsInRoom.map(s => s.id));

    this.io.to(roomCode).emit('game:state', room.gameState.toJSON());
    console.log(`Game started in room ${roomCode}`);
  }

  handleAction(socket, action) {
    const room = this.rooms[socket.roomCode];
    if (!room) return socket.emit('error', 'Not in a room');
    if (!room.gameState) return socket.emit('error', 'Game not started');

    const gs = room.gameState;
    let result;

    switch (action.type) {
      case 'roll_dice':           result = gs.rollDice(socket.id, action.numDice ?? 1); break;
      case 'reroll_dice':         result = gs.rerollDice(socket.id, action.numDice ?? 1); break;
      case 'apply_harbor_bonus':  result = gs.applyHarborBonus(socket.id); break;
      case 'resolve_income':      result = gs.resolveIncome(); break;
      case 'resolve_purple_target': result = gs.resolvePurpleTarget(socket.id, action.targetPlayerId, action.swapCardUid ?? null); break;
      case 'buy_establishment':   result = gs.buyEstablishment(socket.id, action.cardUid); break;
      case 'build_landmark':      result = gs.buildLandmark(socket.id, action.landmarkId); break;
      case 'take_setup_coin':     result = gs.takeSetupCoin(socket.id); break;
      case 'skip_construction':   result = gs.skipConstruction(socket.id); break;
      default: return socket.emit('error', `Unknown action: ${action.type}`);
    }

    if (result?.error) return socket.emit('error', result.error);

    this.io.to(socket.roomCode).emit('game:state', gs.toJSON());

    if (gs.winner) {
      const winner = gs.players.find((p) => p.id === gs.winner);
      this.io.to(socket.roomCode).emit('game:over', { winnerId: gs.winner, winnerName: winner?.name });
    }
  }

  handleDisconnect(socket) {
    const roomCode = socket.roomCode;
    if (!roomCode) return;
    const room = this.rooms[roomCode];
    if (!room) return;

    const leaving = room.players.find((p) => p.id === socket.id);
    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      delete this.rooms[roomCode];
      console.log(`Room ${roomCode} deleted (empty)`);
      return;
    }

    if (leaving?.host && !room.gameState) {
      room.players[0].host = true;
    }

    this._emitRoomUpdate(roomCode);
  }

  _emitRoomUpdate(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return;

    for (const player of room.players) {
      this.io.to(player.id).emit('room:update', this._roomView(room, player.id));
    }
  }

  _roomView(room, currentPlayerId) {
    return { ...room, currentPlayerId };
  }
}

module.exports = RoomManager;
