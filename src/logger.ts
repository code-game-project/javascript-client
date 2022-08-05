/** A class that provides a few methods for logging. */
export abstract class Logger {
  /** Prints a success message. */
  public abstract success(message: any, context?: any): void;
  /** Prints a warning message. */
  public abstract warn(message: any, context?: any): void;
  /** Prints an informational message. */
  public abstract info(message: any, context?: any): void;
  /** Prints an error message. */
  public abstract error(message: any, context?: any): void;
}
