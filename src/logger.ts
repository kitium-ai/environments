import { type ErrorContext, KitiumError } from "@kitiumai/error";
import { getLogger, type IAdvancedLogger, LogLevel } from "@kitiumai/logger";

export { LogLevel };

export type EnvkitLogger = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (
    message: string,
    error?: Error | KitiumError,
    metadata?: Record<string, unknown>,
  ) => void;
  debug: (message: string, metadata?: Record<string, unknown>) => void;
};

/**
 * Get a logger instance for envkit operations
 */
export function getEnvkitLogger(
  context: Record<string, unknown> = {},
): EnvkitLogger {
  const logger = getLogger();
  const prefix = "[envkit]";

  // Use child logger with context if available (IAdvancedLogger interface)
  const contextualLogger =
    "child" in logger && typeof logger.child === "function"
      ? (logger as IAdvancedLogger).child({ component: "envkit", ...context })
      : logger;

  return {
    info: (message: string, metadata?: Record<string, unknown>): void => {
      contextualLogger.info(`${prefix} ${message}`, {
        ...context,
        ...metadata,
      });
    },
    warn: (message: string, metadata?: Record<string, unknown>): void => {
      contextualLogger.warn(`${prefix} ${message}`, {
        ...context,
        ...metadata,
      });
    },
    error: (
      message: string,
      error?: Error | KitiumError,
      metadata?: Record<string, unknown>,
    ): void => {
      if (error) {
        contextualLogger.error(
          `${prefix} ${message}`,
          { ...context, ...metadata },
          error,
        );
      } else {
        contextualLogger.error(`${prefix} ${message}`, {
          ...context,
          ...metadata,
        });
      }
    },
    debug: (message: string, metadata?: Record<string, unknown>): void => {
      contextualLogger.debug(`${prefix} ${message}`, {
        ...context,
        ...metadata,
      });
    },
  };
}

/**
 * Create an error for envkit operations
 */
export function createEnvkitError(
  code: string,
  message: string,
  options?: {
    cause?: Error;
    context?: Record<string, unknown>;
    retryable?: boolean;
  },
): KitiumError {
  const errorShape = {
    code: `envkit/${code}`,
    message,
    severity: "error" as const,
    kind: "internal" as const,
    retryable: options?.retryable ?? false,
    source: "@kitiumai/envkit",
    ...(options?.cause && { cause: options.cause }),
    ...(options?.context && {
      context: { ...options.context } as ErrorContext,
    }),
  };

  return new KitiumError(errorShape);
}
