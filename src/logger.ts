import { getLogger, LogLevel } from '@kitiumai/logger';
import { KitiumError } from '@kitiumai/error';

export { LogLevel };

/**
 * Get a logger instance for envkit operations
 */
export function getEnvkitLogger(context?: Record<string, unknown>) {
  const logger = getLogger();
  const prefix = '[envkit]';

  return {
    info: (message: string, metadata?: Record<string, unknown>) => {
      logger.info(`${prefix} ${message}`, { ...context, ...metadata });
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      logger.warn(`${prefix} ${message}`, { ...context, ...metadata });
    },
    error: (message: string, err?: Error | KitiumError, metadata?: Record<string, unknown>) => {
      if (err) {
        logger.error(`${prefix} ${message}`, { ...context, ...metadata }, err);
      } else {
        logger.error(`${prefix} ${message}`, { ...context, ...metadata });
      }
    },
    debug: (message: string, metadata?: Record<string, unknown>) => {
      logger.debug(`${prefix} ${message}`, { ...context, ...metadata });
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
  }
): KitiumError {
  return new KitiumError({
    code: `envkit/${code}`,
    message,
    severity: 'error',
    kind: 'internal',
    retryable: options?.retryable ?? false,
    source: '@kitiumai/envkit',
    cause: options?.cause,
    context: options?.context,
  });
}
