import { AnyEvent, Socket } from './socket.js';
import { Logger } from './logger.js';
import { DataStore } from './data-store.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import consola from 'consola';
import WebSocket from 'ws';
import envPaths from 'env-paths';
import fetch from 'node-fetch';

class NodeLogger extends Logger {
  public success(msg: string) {
    consola.success({ message: msg, badge: true });
  }
  public warn(msg: string) {
    consola.warn({ message: msg, badge: true });
  }
  public info(msg: string) {
    consola.info({ message: msg, badge: true });
  }
  public error(msg: string) {
    consola.error({ message: String(msg), badge: true });
  }
}

class NodeDataStore extends DataStore {
  public readonly GAMES_PATH = join(envPaths('codegame', { suffix: '' }).data, 'games');
  /**
   * Creates a directory.
   * @param path file path
   */
  private mkdir(path: string[]): void {
    let currentPath = "";
    for (const directory of path) {
      currentPath = join(currentPath, directory);
      if (existsSync(currentPath)) continue;
      mkdirSync(currentPath);
    }
  }
  /**
   * Reads from a file.
   * @param path file path
   */
  public readJSON<T extends object>(path: string[]): T | null {
    return existsSync(join(...path)) ? JSON.parse(readFileSync(join(...path), { encoding: 'utf-8' })) : null;
  }
  /**
   * Writes to a file.
   * @param path file path
   * @param data data to write
   */
  public writeJSON(path: string[], data: object): void {
    this.mkdir(path.length <= 1 ? path : path.slice(0, path.length - 1));
    writeFileSync(join(...path), JSON.stringify(data, null, 2));
  }
  /**
   * Deletes a file.
   * @param path file path
   */
  public _delete(path: string[]): void {
    unlinkSync(join(...path));
  }
}

/**
 * Creates a new CodeGame `Socket` for the Node.js environment.
 * @param url The URL of the game server.
 * @param verbosity The level of verbosity when logging.
 * 
 * __Note:__ You may see the docs for this function in your editor, even if you are not using Node.js.
 * Just make sure that your bundler uses the `"browser"` version as defined in the `package.json`.
 */
export const createSocket = <Events extends AnyEvent>(url: string, verbosity?: 'silent' | 'error' | 'info' | 'debug'): Socket<Events> => new Socket<Events>(
  new NodeLogger(), new NodeDataStore(), fetch as any, WebSocket as any, url, verbosity
);

export { Socket, EventListenerCallback, AnyEvent, EventListenerWrapper, EventWrapper, Session } from './socket.js';
export { Logger } from './logger.js';
export { DataStore } from './data-store.js';
export * as standardEvents from './standard-events.js';
