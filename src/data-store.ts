/** A class that provides a few methods for storing JSON data. */
export abstract class DataStore {
  /** Path to the location where the sessions and other codegame related data is stored. */
  public abstract readonly GAMES_LOCATION: string;
  /**
   * Reads JSON data from persistent storage.
   * @param location The location.
   * @returns an object.
   */
  public abstract readJSON<T extends object>(location: string[]): T | null;
  /**
   * Saves JSON data to persistent storage.
   * @param location The location.
   * @param data The data.
   */
  public abstract writeJSON<T extends object>(location: string[], data: T): void;
  /**
   * Deletes something from persistent storage.
   * @param location The location.
   */
  public abstract _delete(location: string[]): void;
}
