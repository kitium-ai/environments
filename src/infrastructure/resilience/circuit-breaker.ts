import { getEnvkitLogger } from "../../logger.js";

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half-open",
}

/**
 * Circuit breaker configuration
 */
export type CircuitBreakerConfig = {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes to close circuit from half-open
  resetTimeoutMs: number; // Time before attempting to reset (transition to half-open)
};

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 60000, // 1 minute
};

/**
 * Circuit Breaker Pattern
 * Prevents cascade failures by stopping calls to failing services
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | undefined;
  private readonly config: CircuitBreakerConfig;
  private readonly logger = getEnvkitLogger({ component: "circuit-breaker" });

  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should reset
    this.checkReset();

    if (this.state === CircuitBreakerState.OPEN) {
      this.logger.warn("Circuit breaker is open", { breaker: this.name });
      throw new Error(`Circuit breaker is open for ${this.name}`);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.setState(CircuitBreakerState.CLOSED);
        this.successCount = 0;
        this.logger.info("Circuit breaker closed", { breaker: this.name });
      }
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.config.failureThreshold &&
      this.state === CircuitBreakerState.CLOSED
    ) {
      this.setState(CircuitBreakerState.OPEN);
      this.logger.warn("Circuit breaker opened", {
        breaker: this.name,
        failures: this.failureCount,
      });
    }
  }

  /**
   * Check if circuit should reset to half-open
   */
  private checkReset(): void {
    if (this.state !== CircuitBreakerState.OPEN) {
      return;
    }

    if (!this.lastFailureTime) {
      return;
    }

    const timeSinceFailure = Date.now() - this.lastFailureTime;
    if (timeSinceFailure >= this.config.resetTimeoutMs) {
      this.setState(CircuitBreakerState.HALF_OPEN);
      this.successCount = 0;
      this.logger.info("Circuit breaker half-open (attempting reset)", {
        breaker: this.name,
      });
    }
  }

  /**
   * Change state and log transition
   */
  private setState(newState: CircuitBreakerState): void {
    if (newState === this.state) {
      return;
    }
    const oldState = this.state;
    this.state = newState;
    this.logger.debug("Circuit breaker state changed", {
      breaker: this.name,
      from: oldState,
      to: newState,
    });
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    this.checkReset();
    return this.state;
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.logger.info("Circuit breaker manually reset", { breaker: this.name });
  }
}
