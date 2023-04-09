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
  public readonly GAMES_LOCATION = 'codegame';
  /**
   * Reads JSON data from `LocalStorage`.
   * @param key The `LocalStorage` key.
   * @returns an object.
   */
  public readJSON<T extends object>(key: string[]): T | null {
    const value = window.localStorage.getItem(key.join('.'));
    if (!value) return null;
    else return JSON.parse(value);
  }
  /**
   * Saves JSON data to `LocalStorage`.
   * @param key The `LocalStorage` key.
   * @param data The data.
   */
  public writeJSON(key: string[], data: object): void {
    window.localStorage.setItem(key.join('.'), JSON.stringify(data));
  }
  /**
   * Deletes something from `LocalStorage`.
   * @param key The `LocalStorage` key.
   */
  public _delete(key: string[]): void {
    window.localStorage.removeItem(key.join('.'));
  }
}

/**
 * Creates a new CodeGame `GameSocket` for the Browser environment.
 * @param url The URL of the game server.
 * @param verbosity The level of verbosity when logging.
 */
export const createSocket = <Commands extends AnyCommand, Events extends AnyEvent, Config extends object = object>(
  url: string,
  verbosity?: Verbosity
) => new GameSocket<Commands, Events, Config>(
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
export const createDebugSocket = <Config extends object = object>(
  url: string,
  verbosity?: Verbosity
) => new DebugSocket<Config>(
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
export * as api from './api.js';
