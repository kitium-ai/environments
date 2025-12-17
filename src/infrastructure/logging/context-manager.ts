import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request context for correlation and tracing
 */
export type RequestContext = {
  correlationId: string;
  requestId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
};

/**
 * Context Manager for request-scoped logging
 * Uses AsyncLocalStorage to thread context through async operations
 */
export class ContextManager {
  private static readonly storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Generate a unique correlation ID
   */
  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate a unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Set context for the current async operation
   */
  static setContext(context: RequestContext): void {
    this.storage.enterWith(context);
  }

  /**
   * Get current context
   */
  static getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Get correlation ID from current context
   */
  static getCorrelationId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  /**
   * Run operation with context
   */
  static runWithContext<T>(
    context: RequestContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(context, fn);
  }

  /**
   * Create a new context
   */
  static createContext(overrides?: Partial<RequestContext>): RequestContext {
    const context: RequestContext = {
      correlationId: overrides?.correlationId ?? this.generateCorrelationId(),
      requestId: overrides?.requestId ?? this.generateRequestId(),
      timestamp: overrides?.timestamp ?? new Date(),
      ...(overrides?.userId !== undefined ? { userId: overrides.userId } : {}),
      ...(overrides?.metadata !== undefined
        ? { metadata: overrides.metadata }
        : {}),
    };

    return context;
  }

  /**
   * Clear context (for cleanup)
   */
  static clearContext(): void {
    // AsyncLocalStorage doesn't have a direct clear, but exiting scope clears it
    this.storage.getStore();
  }
}
