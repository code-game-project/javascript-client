/** A class that provides a few methods for storing JSON data. */
export abstract class DataStore {
  /** Path to the location where the sessions are stored. */
  public abstract readonly GAMES_PATH: string;
  /**
   * Reads from persistent storage.
   * @param path a path
   */
  public abstract readJSON<T extends object>(path: string[]): T | null;
  /**
   * Writes to persistent storage.
   * @param path a path
   * @param data data to write
   */
  public abstract writeJSON<T extends object>(path: string[], data: T): void;
  /**
   * Deletes something from persistent storage.
   * @param path a path
   */
  public abstract _delete(path: string[]): void;
}
