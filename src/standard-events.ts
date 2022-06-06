/*
 * CodeGame Protocol v0.6 Standard Events
 */

/**
 * Join an existing game by ID.
 */
export interface CgJoin {
  name: "cg_join",
  data: {
    /**
     * The ID of the game to join.
     */
    game_id: string,
    /**
     * The name of your new user.
     */
    username: string,
  },
}

/**
 * The `cg_joined` event is used to send a secret to the player that just joined so that they can reconnect and add other clients.
 * It also confirms that the game has been joined successfully.
 */
export interface CgJoined {
  name: "cg_joined",
  data: {
    /**
     * The player secret.
     */
    secret: string,
  },
}

/**
 * The `new_player` event is sent to everyone in the game when someone joins it.
 */
export interface CgNewPlayer {
  name: "cg_new_player",
  data: {
    /**
     * The username of the newly joined player.
     */
    username: string,
  },
}

/**
 * The `cg_leave` event is used to leave a game which is the preferred way to exit a game in comparison to just disconnecting and never reconnecting.
 * It is not required to send this event due to how hard it is to detect if the user has disconnected for good or is just re-writing their program.
 */
export interface CgLeave {
  name: "cg_leave",
  data?: undefined,
}

/**
 * The `cg_left` event is sent to everyone in the game when someone leaves it.
 */
export interface CgLeft {
  name: "cg_left",
  data?: undefined,
}

/**
 * The `cg_connect` event is used to associate a client with an existing player.
 * This event is used after making changes to ones program and reconnecting to the game or when adding another client like a viewer in the webbrowser.
 */
export interface CgConnect {
  name: "cg_connect",
  data: {
    /**
     * The ID of the game to connect to.
     */
    game_id: string,
    /**
     * The ID of the player to connect to.
     */
    player_id: string,
    /**
     * The secret of the player to connect to.
     */
    secret: string,
  },
}

/**
 * The `cg_connected` event is sent to the socket that has connected.
 */
export interface CgConnected {
  name: "cg_connected",
  data: {
    /**
     * The username of the player.
     */
    username: string,
  },
}

/**
 * The `cg_spectate` event is used to spectate a game.
 * Spectators receive all public game events but cannot send any.
 */
export interface CgSpectate {
  name: "cg_spectate",
  data: {
    /**
     * The ID of the game to spectate.
     */
    game_id: string,
  },
}

/**
 * The `cg_info` event is sent to every player that joins, connects to or spectates a game and catches them up
 * on things that may have happened before they were connected.
 */
export interface CgInfo {
  name: "cg_info",
  data: {
    /**
     * The IDs of all players currently in the game mapped to their respective usernames.
     */
    players: { [index: string]: string },
  },
}

/**
 * The error event is sent to the client that triggered the error.
 * The error event should only be used for technical errors such as event deserialisation errors.
 * If something in the game doesn’t work intentionally or a very specific error that requires
 * handeling by the client occurs, a custom event should be used.
 */
export interface CgError {
  name: "cg_error",
  data: {
    /**
     * The error message.
     */
    message: string,
  },
}

export type Events = CgJoin | CgJoined | CgNewPlayer | CgLeave | CgLeft | CgConnect | CgConnected | CgSpectate | CgInfo | CgError;
