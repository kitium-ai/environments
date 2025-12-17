import type { KitiumError } from "@kitiumai/error";
import { getLogger, type IAdvancedLogger } from "@kitiumai/logger";

import { ContextManager, type RequestContext } from "./context-manager.js";

/**
 * Enhanced logger with context threading
 */
export type ContextualLogger = {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (
    message: string,
    error?: Error | KitiumError,
    metadata?: Record<string, unknown>,
  ) => void;
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  getContext: () => RequestContext | undefined;
};

/**
 * Logger Factory with context threading
 * Injects correlation ID and request context into all log entries
 */
export class LoggerFactory {
  private static readonly baseLogger = getLogger();

  /**
   * Create a contextual logger with correlation ID threading
   */
  static createLogger(component: string): ContextualLogger {
    const contextualLogger =
      "child" in this.baseLogger && typeof this.baseLogger.child === "function"
        ? (this.baseLogger as IAdvancedLogger).child({ component })
        : this.baseLogger;

    return {
      info: (message: string, metadata?: Record<string, unknown>): void => {
        const context = ContextManager.getContext();
        const contextMetadata = this.buildContextMetadata(context, metadata);
        contextualLogger.info(`[${component}] ${message}`, contextMetadata);
      },

      warn: (message: string, metadata?: Record<string, unknown>): void => {
        const context = ContextManager.getContext();
        const contextMetadata = this.buildContextMetadata(context, metadata);
        contextualLogger.warn(`[${component}] ${message}`, contextMetadata);
      },

      error: (
        message: string,
        error?: Error | KitiumError,
        metadata?: Record<string, unknown>,
      ): void => {
        const context = ContextManager.getContext();
        const contextMetadata = this.buildContextMetadata(context, metadata);

        if (error) {
          contextualLogger.error(
            `[${component}] ${message}`,
            contextMetadata,
            error,
          );
        } else {
          contextualLogger.error(`[${component}] ${message}`, contextMetadata);
        }
      },

      debug: (message: string, metadata?: Record<string, unknown>): void => {
        const context = ContextManager.getContext();
        const contextMetadata = this.buildContextMetadata(context, metadata);
        contextualLogger.debug(`[${component}] ${message}`, contextMetadata);
      },

      getContext: (): RequestContext | undefined => {
        return ContextManager.getContext();
      },
    };
  }

  /**
   * Build metadata with context threading
   */
  private static buildContextMetadata(
    context: RequestContext | undefined,
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> {
    const contextData: {
      correlationId?: string;
      requestId?: string;
      userId?: string;
      contextData?: Record<string, unknown>;
    } = {};

    if (context) {
      contextData.correlationId = context.correlationId;
      contextData.requestId = context.requestId;
      if (context.userId) {
        contextData.userId = context.userId;
      }
      if (context.metadata) {
        contextData.contextData = context.metadata;
      }
    }

    return {
      ...contextData,
      ...metadata,
    };
  }

  /**
   * Create a context and run operation with logging
   */
  static async runWithContext<T>(
    component: string,
    operation: (context: RequestContext) => Promise<T>,
    contextOverrides?: Partial<RequestContext>,
  ): Promise<T> {
    const context = ContextManager.createContext(contextOverrides);
    const logger = this.createLogger(component);

    logger.info("Operation started", { requestId: context.requestId });

    try {
      return await ContextManager.runWithContext(context, () =>
        operation(context),
      );
    } catch (error) {
      logger.error(
        "Operation failed",
        error instanceof Error ? error : undefined,
        {
          requestId: context.requestId,
        },
      );
      throw error;
    } finally {
      logger.info("Operation completed", { requestId: context.requestId });
    }
  }
}
