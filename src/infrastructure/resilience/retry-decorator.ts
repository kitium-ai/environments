import { getEnvkitLogger } from "../../logger.js";

/**
 * Retry configuration
 */
export type RetryConfig = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: Error) => boolean;
};

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Retry Decorator with exponential backoff
 * Automatically retries failed operations with exponential backoff
 */
export class RetryDecorator {
  private readonly logger = getEnvkitLogger({ component: "retry-decorator" });

  /**
   * Decorate an async function with retry logic
   */
  decorate<T extends(...args: unknown[]) => Promise<unknown>>(
    fn: T,
    config: Partial<RetryConfig> = {},
  ): T {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

    return (async (...args: unknown[]): Promise<unknown> => {
      let lastError: Error | undefined;
      let delayMs = finalConfig.initialDelayMs;

      for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
        try {
          this.logger.debug("Executing operation", {
            attempt,
            maxAttempts: finalConfig.maxAttempts,
          });
          return await fn(...args);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Check if error is retryable
          if (
            finalConfig.retryableErrors &&
            !finalConfig.retryableErrors(lastError)
          ) {
            throw lastError;
          }

          // If last attempt, throw
          if (attempt === finalConfig.maxAttempts) {
            this.logger.error(
              "Operation failed after max attempts",
              lastError,
              {
                maxAttempts: finalConfig.maxAttempts,
              },
            );
            throw lastError;
          }

          // Calculate next delay with exponential backoff
          delayMs = Math.min(
            delayMs * finalConfig.backoffMultiplier,
            finalConfig.maxDelayMs,
          );

          this.logger.warn("Operation failed, retrying", {
            attempt,
            nextDelayMs: delayMs,
            error: lastError.message,
          });

          // Wait before retry
          await this.delay(delayMs);
        }
      }

      throw lastError ?? new Error("Operation failed");
    }) as T;
  }

  /**
   * Execute function with retry
   */
  async execute<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | undefined;
    let delayMs = finalConfig.initialDelayMs;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (
          finalConfig.retryableErrors &&
          !finalConfig.retryableErrors(lastError)
        ) {
          throw lastError;
        }

        if (attempt === finalConfig.maxAttempts) {
          throw lastError;
        }

        delayMs = Math.min(
          delayMs * finalConfig.backoffMultiplier,
          finalConfig.maxDelayMs,
        );
        await this.delay(delayMs);
      }
    }

    throw lastError ?? new Error("Operation failed");
  }

  /**
   * Sleep for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
