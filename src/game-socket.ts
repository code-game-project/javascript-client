import { Verbosity, Socket } from './socket.js';
import { createGame, createPlayer } from './api.js';

/** Interface representing all possible valid commands. */
export type AnyCommand = {
  name: string,
  data?: object | undefined;
};

/** Interface representing all possible valid events. */
export type AnyEvent = {
  name: string,
  data?: object | undefined;
};

/** Signature of an event listener function. */
export type EventListenerCallback<DataThing extends { data?: object | undefined; }> = (data: DataThing['data']) => void;

/** Session data (to be saved in persistant storage). */
export interface Session {
  game_id: string,
  player_id: string,
  player_secret: string,
}

/** A class that helps creating and connecting to games, as well as sending commands and receiving events. */
export class GameSocket<Commands extends AnyCommand = AnyCommand, Events extends AnyEvent = AnyEvent> extends Socket {
  /** The current player session. */
  private session?: Session;
  /** WebSocket message handler. */
  private readonly messageHandler = (data: MessageEvent<any>) => {
    try {
      const event: Events = JSON.parse(data.data);
      if (this.verbosityReached(Verbosity.DEBUG)) {
        this.logger.info(`received "${event.name}":`, event);
      }
      this.triggerListeners(event.name, event.data);
    } catch (error) {
      if (this.verbosityReached(Verbosity.ERROR)) {
        this.logger.error('Error in WebSocket "message" event listener:', error);
      };
    }
  };

  /**
   * Registers an event listener for a certain event.
   * @param name Name of the event to listen for.
   * @param callback Function that is executed when the event is received.
   * @returns the listener's ID
   */
  public on<Event extends Events>(name: Event['name'], callback: EventListenerCallback<Event>): symbol {
    return this.listen(name, callback, false);
  }

  /**
   * Registers an event listener for a certain event that will self-destruct after being triggered once.
   * @param name Name of the event to listen for.
   * @param callback Function that is executed when the event is received.
   * @returns the listener's ID
   */
  public once<Event extends Events>(name: Event['name'], callback: EventListenerCallback<Event>): symbol {
    return this.listen(name, callback, true);
  }

  /**
   * Sends a command.
   * @param name The name of the command to be sent.
   * @param data Optional options to go along with your command.
   */
  public send<Command extends Commands>(name: Command['name'], ...data: Command['data'] extends undefined ? [undefined?] : [Command['data']]): void {
    const zerothData = data[0];
    try {
      if (this.socket) {
        this.socket.send(JSON.stringify({ name, data: zerothData }));
        if (this.verbosityReached(Verbosity.DEBUG)) {
          this.logger.info(`sent "${name}":`, zerothData);
        }
      } else if (this.verbosityReached(Verbosity.ERROR)) this.logger.error('There is currently no WebSocket connection established!');
    } catch (err) {
      if (this.verbosityReached(Verbosity.ERROR)) {
        this.logger.error(`Unable to send command "${name}":`, err);
      }
    }
  }

  /**
   * Gets the current session details.
   * @returns the session
   */
  public getSession(): Readonly<Session | undefined> {
    return this.session;
  }

  /**
   * Saves the current session details.
   * @returns the session
   */
  protected saveSession(host: string, username: string, gameId: string, playerId: string, playerSecret: string): Session {
    this.session = {
      game_id: gameId,
      player_id: playerId,
      player_secret: playerSecret,
    };
    this.dataStore.writeJSON<Session>([this.dataStore.GAMES_PATH, encodeURIComponent(host), username], this.session);
    return this.session;
  }

  /**
   * Tries to restore the session.
   * @param username The username that was used when the session was created.
   * @throws if the session cannot be restored
   * @chainable
   */
  public async restoreSession(username: string): Promise<this> {
    const session = this.dataStore.readJSON<Session>([this.dataStore.GAMES_PATH, encodeURIComponent(this.host), username]);
    if (!session) throw `Unable to restore session for game server "${this.host}" and username "${username}".`;
    this.session = session;
    await this.connect(this.session.game_id, this.session.player_id, this.session.player_secret);
    return this;
  };

  /**
   * Creates a new game.
   * @param _public Wheather the game should be listed as public.
   * @param _protected Whether the game should require an additional secret to join.
   * @param config Game-specific configuration options.
   * @returns the game ID.
   * @throws if something goes wrong during the create process
   */
  public async create<Config extends object = object>(_public: boolean, _protected: boolean, config?: Config): Promise<{ gameId: string, joinSecret?: string; }> {
    const res = await createGame(this.fetch, await this.protocol('http') + this.host, { public: _public, protected: _protected, config });
    if (res.data && 'game_id' in res.data) {
      if (this.verbosityReached(Verbosity.INFO)) this.logger.info(`Created game with ID "${res.data.game_id}".`);
      this.gameId = res.data.game_id;
      return { gameId: res.data.game_id, joinSecret: res.data.join_secret };
    }
    if (this.verbosityReached(Verbosity.ERROR)) this.logger.error('Unable to create a new game.');
    if (res.statusCode === 403) throw 'Unable to create new game due to config limit.';
    if (res.statusCode === 500) throw 'Unable to create new game due to technical limit.';
    if (res.networkError) throw 'A network error occurred while trying to connect to the server.';
    throw res.error || 'Something went extremely wrong.';
  }

  /**
   * Joins an existing game.
   * @param gameId The ID of the game to join.
   * @param username The username to join with.
   * @param join_secret An additional secret required to join protected games.
   * @throws if something goes wrong during the join process
   * @chainable
   */
  public async join(gameId: string, username: string, join_secret?: string): Promise<this> {
    this.gameId = gameId;
    const res = await createPlayer(this.fetch, { game_id: gameId }, await this.protocol('http') + this.host, { username, join_secret });
    if (res.data && 'player_id' in res.data && 'player_secret' in res.data) {
      const { game_id, player_id, player_secret } = this.saveSession(this.host, username, gameId, res.data.player_id, res.data.player_secret);
      await this.connect(game_id, player_id, player_secret);
      return this;
    }
    if (this.verbosityReached(Verbosity.ERROR)) this.logger.error('Unable to join game.');
    if (res.statusCode === 403) throw res.text || 'Invalid join_secret or game full.';
    if (res.statusCode === 404) throw 'Unable to find game.';
    if (res.statusCode === 500) throw 'Unable to create a new player.';
    if (res.networkError) throw 'A network error occurred while trying to connect to the server.';
    throw res.error || 'Something went extremely wrong.';
  };

  /**
   * Connects to a game and player using session credentials.
   * @param gameId The ID of the game to connect to.
   * @param playerId The ID of the player to connect to.
   * @param playerSecret The secret of the player.
   * @throws if something goes wrong during the connect process
   * @chainable
   */
  public async connect(gameId: string, playerId: string, playerSecret: string): Promise<this> {
    this.gameId = gameId;
    const username = await this.getUsername(playerId);
    if (username) {
      this.saveSession(this.host, username, gameId, playerId, playerSecret);
      await this.makeWebSocketConnection(`/api/games/${gameId}/connect?player_id=${playerId}&player_secret=${playerSecret}`, this.messageHandler);
      return this;
    } else {
      throw `Player with ID "${playerId}" does not exist on the specifited game server "${this.host}".`;
    }
  };

  /**
   * Join a game as a spectator.
   * @param gameId The ID of the game to spectate.
   * @throws if the connection cannot be established
   * @chainable
   */
  public async spectate(gameId: string): Promise<this> {
    this.gameId = gameId;
    await this.makeWebSocketConnection(`/api/games/${gameId}/spectate`, this.messageHandler);
    return this;
  }
}
