// Socket event names — single source of truth for client & server
const EVENTS = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_UPDATE: 'room:update',
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_ACTION: 'game:action',
  GAME_LOG: 'game:log',
  ERROR: 'error',
};

// Game phases (state machine)
const PHASES = {
  LOBBY: 'lobby',
  INITIAL_BUILD: 'initial_build',
  ROLL_DICE: 'roll_dice',
  RESOLVE_INCOME: 'resolve_income',
  CONSTRUCT: 'construct',
  END_TURN: 'end_turn',
  GAME_OVER: 'game_over',
};

// Card activation colours
const CARD_COLOR = {
  BLUE: 'blue',     // activates on anyone's roll
  GREEN: 'green',   // activates only on your roll
  RED: 'red',       // activates on other players' rolls
  PURPLE: 'purple', // activates on your roll (major establishments)
};

module.exports = { EVENTS, PHASES, CARD_COLOR };
