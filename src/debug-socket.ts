import { Verbosity, Socket } from './socket.js';

/** Severity levels. */
export enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  TRACE = 'trace'
}

/** A debug message. */
export type DebugMessage = {
  severity: Severity,
  message: string,
  data?: object;
};

/** Signature of a debug message listener function. */
export type DebugListenerCallback = (message: string, data?: object) => void;

export class DebugSocket extends Socket {
  /** WebSocket message handler. */
  private readonly messageHandler = (data: MessageEvent<any>) => {
    try {
      const message: DebugMessage = JSON.parse(data.data);
      if (this.verbosityReached(Verbosity.DEBUG)) {
        this.logger.info(`${message.severity.toUpperCase()}: ${message.message}`, message.data);
      }
      this.triggerListeners(message.severity, message.message, message.data);
    } catch (error) {
      if (this.verbosityReached(Verbosity.ERROR)) {
        this.logger.error('Error in WebSocket "message" event listener:', error);
      };
    }
  };

  /**
   * Registers a debug message listener for a certain severity.
   * @param severity Severity to listen for.
   * @param callback Function that is executed when a message with the specified severity is received.
   * @returns the listener's ID
   */
  public on(severity: Severity, callback: DebugListenerCallback): symbol {
    return this.listen(severity, callback, false);
  }

  /**
   * Registers a debug message listener for a certain severity that will self-destruct after being triggered once.
   * @param severity Severity to listen for.
   * @param callback Function that is executed when a message with the specified severity is received.
   * @returns the listener's ID
   */
  public once(severity: Severity, callback: DebugListenerCallback): symbol {
    return this.listen(severity, callback, true);
  }

  /**
   * Debug a server.
   * @throws if the connection cannot be established
   * @chainable
   */
  public async debugServer(): Promise<this> {
    await this.makeWebSocketConnection(`/api/debug`, this.messageHandler);
    return this;
  }

  /**
   * Debug a game.
   * @param gameId The ID of the game to debug.
   * @throws if the connection cannot be established
   * @chainable
   */
  public async debugGame(gameId: string): Promise<this> {
    this.gameId = gameId;
    await this.makeWebSocketConnection(`/api/games/${gameId}/debug`, this.messageHandler);
    return this;
  }

  /**
   * Debug a player.
   * @param gameId The ID of the game to debug.
   * @param playerId The ID of the player to debug.
   * @param playerSecret The secret of the player to debug.
   * @throws if the connection cannot be established
   * @chainable
   */
  public async debugPlayer(gameId: string, playerId: string, playerSecret: string): Promise<this> {
    this.gameId = gameId;
    await this.makeWebSocketConnection(`/api/games/${gameId}/players/${playerId}/debug?player_secret=${playerSecret}`, this.messageHandler);
    return this;
  }
}
