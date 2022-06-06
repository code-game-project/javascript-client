/** A class that provides a few methods for logging. */
export abstract class Logger {
  /** Prints a success message. */
  public abstract success(msg: string): void;
  /** Prints a warning message. */
  public abstract warn(msg: string): void;
  /** Prints an informational message. */
  public abstract info(msg: string): void;
  /** Prints an error message. */
  public abstract error(msg: any): void;
}
