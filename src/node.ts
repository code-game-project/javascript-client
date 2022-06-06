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
  };
  /**
   * Reads from a file.
   * @param path file path
   */
  public readJSON(path: string[]): object {
    return JSON.parse(readFileSync(join(...path), { encoding: 'utf-8' }));
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

export const createSocket = <Events extends AnyEvent>(host: string, verbose?: 'silent' | 'error' | 'info' | 'debug'): Socket<Events> => new Socket<Events>(
  new NodeLogger(), new NodeDataStore(), fetch as any, WebSocket as any, host, verbose
);

export { Socket } from './socket';
export { Logger } from './logger';
export { DataStore } from './data-store';
export * as standardEvents from './standard-events';
