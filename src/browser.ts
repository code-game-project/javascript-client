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
  public readJSON(path: string[]): object | null {
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

export const createSocket = <Events extends AnyEvent>(host: string, verbose?: 'silent' | 'error' | 'info' | 'debug'): Socket<Events> => new Socket<Events>(
  new BrowserLogger(), new BrowserDataStore(), window.fetch, WebSocket, host, verbose
);

export { Socket } from './socket';
export { Logger } from './logger';
export { DataStore } from './data-store';
export * as standardEvents from './standard-events';
