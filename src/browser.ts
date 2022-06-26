import { AnyEvent, Socket } from './socket';
import { Logger } from './logger';
import { DataStore } from './data-store';

class BrowserLogger extends Logger {
  public success(msg: string) {
    console.log(`%c${msg}`, 'color: #57c12a');
  }
  public warn(msg: string) {
    console.warn(msg);
  }
  public info(msg: string) {
    console.info(msg);
  }
  public error(msg: string) {
    console.error(msg);
  }
}

class BrowserDataStore extends DataStore {
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
 * Creates a new CodeGame `Socket` for the Browser environment.
 * @param url The URL of the game server.
 * @param verbosity The level of verbosity when logging.
 */
export const createSocket = <Events extends AnyEvent>(url: string, verbosity?: 'silent' | 'error' | 'info' | 'debug'): Socket<Events> => new Socket<Events>(
  new BrowserLogger(), new BrowserDataStore(), (input, init) => window.fetch(input, init), WebSocket, url, verbosity
);

export { Socket, EventListenerCallback, AnyEvent, EventListenerWrapper, EventWrapper, Session } from './socket';
export { Logger } from './logger';
export { DataStore } from './data-store';
export * as standardEvents from './standard-events';
