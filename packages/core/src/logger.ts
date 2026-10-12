// Where the library reports what it does. Injected by the host like the
// providers; by default only warnings and errors reach the console. See ADR 0044.

/** How much a message matters, from most to least verbose. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Receives the library's log messages. `console` is one, so hosts can pass it
 * straight in, or send messages to their own logging.
 *
 * Messages start with their area in brackets, e.g. `[photometry]`, `[scene]`
 * or `[render]`, and may carry details as further arguments.
 */
export interface Logger {
  /** Step-by-step detail, e.g. each scene edit or each file parsed. */
  debug(message: string, ...details: unknown[]): void;
  /** Notable events, e.g. the renderer backend that was picked. */
  info(message: string, ...details: unknown[]): void;
  /** Something went wrong but the library carried on, e.g. a file it couldn't use. */
  warn(message: string, ...details: unknown[]): void;
  /** Something failed. */
  error(message: string, ...details: unknown[]): void;
}

const LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

/** A logger that passes messages at `minLevel` and above to the console. */
export function consoleLogger(minLevel: LogLevel = 'warn'): Logger {
  const from = LEVELS.indexOf(minLevel);
  const at =
    (level: LogLevel) =>
    (message: string, ...details: unknown[]): void => {
      if (LEVELS.indexOf(level) >= from) console[level](message, ...details);
    };
  return { debug: at('debug'), info: at('info'), warn: at('warn'), error: at('error') };
}
