import { getEnvkitLogger } from "../../../logger.js";

/**
 * Transaction interface representing an active transaction
 */
export type ITransaction = {
  /**
   * Unique transaction ID
   */
  readonly id: string;

  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is still active
   */
  isActive(): boolean;
};

/**
 * Compensation function for rollback
 * Undoes a specific operation
 */
export type CompensationFn = () => Promise<void>;

/**
 * Transaction implementation
 * Tracks compensations (rollback actions) for failure recovery
 */
class Transaction implements ITransaction {
  readonly id: string;
  private compensations: CompensationFn[] = [];
  private active = true;
  private readonly logger = getEnvkitLogger({ component: "transaction" });

  constructor(id: string) {
    this.id = id;
    this.logger.info("Transaction started", { transactionId: id });
  }

  /**
   * Register a compensation function (runs on rollback)
   * Functions run in reverse order (LIFO)
   */
  registerCompensation(fn: CompensationFn): void {
    if (!this.active) {
      throw new Error("Cannot register compensation on inactive transaction");
    }
    this.compensations.push(fn);
  }

  /**
   * Commit transaction (clear compensations)
   */
  commit(): Promise<void> {
    if (!this.active) {
      throw new Error("Transaction already completed");
    }

    this.active = false;
    this.compensations = []; // Clear compensations on success
    this.logger.info("Transaction committed", { transactionId: this.id });
    return Promise.resolve();
  }

  /**
   * Rollback transaction (execute compensations in reverse order)
   */
  async rollback(): Promise<void> {
    if (!this.active) {
      this.logger.warn("Rollback called on inactive transaction", {
        transactionId: this.id,
      });
      return;
    }

    this.active = false;
    const errors: Error[] = [];

    // Execute compensations in reverse order (LIFO)
    for (let index = this.compensations.length - 1; index >= 0; index--) {
      try {
        const compensation = this.compensations[index];
        if (compensation) {
          await compensation();
        }
      } catch (error) {
        const error_ =
          error instanceof Error ? error : new Error(String(error));
        this.logger.error("Compensation failed", error_);
        errors.push(error_);
      }
    }

    this.logger.info("Transaction rolled back", {
      transactionId: this.id,
      compensations: this.compensations.length,
      errors: errors.length,
    });

    if (errors.length > 0) {
      throw new Error(
        `Rollback completed with ${errors.length} error(s): ${errors
          .map((error_) => error_.message)
          .join(", ")}`,
      );
    }
  }

  /**
   * Check if transaction is still active
   */
  isActive(): boolean {
    return this.active;
  }
}

/**
 * Transaction Manager
 * Manages transaction lifecycle and compensation tracking
 */
export class TransactionManager {
  private readonly logger = getEnvkitLogger({
    component: "transaction-manager",
  });

  /**
   * Begin a new transaction
   */
  begin(): Promise<ITransaction> {
    const id = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return Promise.resolve(new Transaction(id));
  }

  /**
   * Helper: Execute operation with automatic rollback on failure
   */
  async executeWithRollback<T>(
    operation: (transaction: ITransaction) => Promise<T>,
    compensation?: CompensationFn,
  ): Promise<T> {
    const transaction = await this.begin();

    try {
      const result = await operation(transaction);

      if (compensation) {
        (transaction as Transaction).registerCompensation(compensation);
      }

      await transaction.commit();
      return result;
    } catch (error) {
      this.logger.error(
        "Operation failed, rolling back",
        error instanceof Error ? error : undefined,
      );
      await transaction.rollback();
      throw error;
    }
  }
}
