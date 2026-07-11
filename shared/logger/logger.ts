/**
 * Logging severity levels.
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Structured log payload structure.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Enterprise structured logging utility.
 * Serializes operational logs, audit metrics, and trace contexts to JSON.
 */
export class Logger {
  private static formatEntry(level: LogLevel, message: string, context?: Record<string, any>, err?: Error): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: err ? {
        message: err.message,
        stack: err.stack
      } : undefined
    };
  }

  private static print(entry: LogEntry) {
    // Write JSON formatted string to stdout or console
    const serialized = JSON.stringify(entry);
    if (entry.level === "ERROR") {
      console.error(serialized);
    } else if (entry.level === "WARN") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  /**
   * Records a debug trace entry.
   * 
   * @param message - Diagnostic logging detail.
   * @param context - Optional key-value parameters.
   */
  public static debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV !== "production") {
      this.print(this.formatEntry("DEBUG", message, context));
    }
  }

  /**
   * Records an info operational entry.
   * 
   * @param message - Operational tracking information.
   * @param context - Key-value trace data.
   */
  public static info(message: string, context?: Record<string, any>) {
    this.print(this.formatEntry("INFO", message, context));
  }

  /**
   * Records a warning entry for recoverable exceptions.
   * 
   * @param message - Warning description message.
   * @param context - Key-value diagnostic data.
   */
  public static warn(message: string, context?: Record<string, any>) {
    this.print(this.formatEntry("WARN", message, context));
  }

  /**
   * Records an error entry for operational issues or exceptions.
   * 
   * @param message - Failure description context.
   * @param error - The raised Error object to capture stacktraces.
   * @param context - Key-value diagnostic data.
   */
  public static error(message: string, error?: Error, context?: Record<string, any>) {
    this.print(this.formatEntry("ERROR", message, context, error));
  }
}
