import { Verbosity } from './socket.js';
import { type AnyCommand, type AnyEvent, GameSocket } from './game-socket.js';
import { DebugSocket } from './debug-socket.js';
import { Logger } from './logger.js';
import { DataStore } from './data-store.js';

export class BrowserLogger extends Logger {
  public success(message: any, context?: any) {
    if (context) console.log(message, context);
    else console.log(message);
  }
  public warn(message: any, context?: any) {
    if (context) console.warn(message, context);
    else console.warn(message);
  }
  public info(message: any, context?: any) {
    if (context) console.info(message, context);
    else console.info(message);
  }
  public error(message: any, context?: any) {
    if (context) console.error(message, context);
    else console.error(message);
  }
}

export class BrowserDataStore extends DataStore {
  public readonly GAMES_PATH = 'codegame';
  /**
   * Reads from localStorage
   * @param path localStorage key
   */
  public readJSON<T extends object>(path: string[]): T | null {
    const value = window.localStorage.getItem(path.join('.'));
    if (!value) return null;
    else return JSON.parse(value);
  }
  /**
   * Writes to localStorage.
   * @param path localStorage key
   * @param data data to write
   */
  public writeJSON(path: string[], data: object): void {
    window.localStorage.setItem(path.join('.'), JSON.stringify(data));
  }
  /**
   * Deletes a file or localStorage data.
   * @param path file or localStorage path
   */
  public _delete(path: string[]): void {
    window.localStorage.removeItem(path.join('.'));
  }
}

/**
 * Creates a new CodeGame `GameSocket` for the Browser environment.
 * @param url The URL of the game server.
 * @param verbosity The level of verbosity when logging.
 */
export const createSocket = <Commands extends AnyCommand, Events extends AnyEvent>(
  url: string,
  verbosity?: Verbosity
): GameSocket<Events> => new GameSocket<Commands, Events>(
  new BrowserLogger(),
  new BrowserDataStore(),
  (input, init) => window.fetch(input, init),
  window.WebSocket,
  url,
  verbosity
);

/**
 * Creates a new CodeGame `DebugSocket` for the Browser environment.
 * @param url The URL of the game server.
 * @param verbosity The level of verbosity when logging.
 */
export const createDebugSocket = (
  url: string,
  verbosity?: Verbosity
): DebugSocket => new DebugSocket(
  new BrowserLogger(),
  new BrowserDataStore(),
  (input, init) => window.fetch(input, init),
  window.WebSocket,
  url,
  verbosity
);

// Re-export useful types
export { Verbosity, Socket } from './socket.js';
export { AnyCommand, AnyEvent, EventListenerCallback, Session, GameSocket } from './game-socket.js';
export { Severity, DebugMessage, DebugListenerCallback, DebugSocket } from './debug-socket.js';
export { Logger } from './logger.js';
export { DataStore } from './data-store.js';
