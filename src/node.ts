import { Verbosity } from './socket.js';
import { type AnyCommand, type AnyEvent, GameSocket } from './game-socket.js';
import { DebugSocket } from './debug-socket.js';
import { Logger } from './logger.js';
import { DataStore } from './data-store.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import consola from 'consola';
import WebSocket from 'ws';
import envPaths from 'env-paths';
import fetch from 'node-fetch';

export class NodeLogger extends Logger {
  public success(message: any, context?: any) {
    if (context) consola.success(message, context);
    else consola.success(message);
  }
  public warn(message: any, context?: any) {
    if (context) consola.warn(message, context);
    else consola.warn(message);
  }
  public info(message: any, context?: any) {
    if (context) consola.info(message, context);
    else consola.info(message);
  }
  public error(message: any, context?: any) {
    if (context) consola.error(message, context);
    else consola.error(message);
  }
}

export class NodeDataStore extends DataStore {
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
 * Creates a new CodeGame `GameSocket` for the Node.js environment.
 * @param url The URL of the game server.
 * @param verbosity The level of verbosity when logging.
 *
 * __Note:__ You may see the docs for this function in your editor, even if you are not using Node.js.
 * Just make sure that your bundler uses the `"browser"` version as defined in the `package.json`.
 */
export const createSocket = <Commands extends AnyCommand, Events extends AnyEvent, Config extends object = object>(
  url: string,
  verbosity?: Verbosity
) => new GameSocket<Commands, Events, Config>(
  new NodeLogger(),
  new NodeDataStore(),
  fetch as typeof window.fetch,
  WebSocket as any,
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
  new NodeLogger(),
  new NodeDataStore(),
  fetch as typeof window.fetch,
  WebSocket as any,
  url,
  verbosity
);

// Re-export useful types
export { Verbosity, Socket } from './socket.js';
export { AnyCommand, AnyEvent, EventListenerCallback, Session, GameSocket } from './game-socket.js';
export { Severity, DebugMessage, DebugListenerCallback, DebugSocket } from './debug-socket.js';
export { Logger } from './logger.js';
export { DataStore } from './data-store.js';
