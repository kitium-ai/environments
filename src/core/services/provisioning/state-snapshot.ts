import { getEnvkitLogger } from "../../../logger.js";
import type { IStorageProvider } from "../../../shared/interfaces/storage.interface.js";

/**
 * State snapshot for backup and recovery
 */
export type StateSnapshot = {
  timestamp: Date;
  files: Map<string, string>; // path -> content
};

/**
 * State Snapshot Manager
 * Captures and restores state for transaction rollback
 */
export class StateSnapshotManager {
  private readonly logger = getEnvkitLogger({ component: "state-snapshot" });

  /**
   * Create a snapshot of current state
   */
  async snapshot(
    storage: IStorageProvider,
    paths: string[],
  ): Promise<StateSnapshot> {
    const files = new Map<string, string>();

    for (const path of paths) {
      try {
        if (await storage.exists(path)) {
          const content = await storage.readFile(path);
          files.set(path, content);
        }
      } catch (error) {
        this.logger.warn("Failed to snapshot file", {
          path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info("State snapshot created", {
      files: files.size,
      timestamp: new Date(),
    });

    return {
      timestamp: new Date(),
      files,
    };
  }

  /**
   * Restore state from snapshot
   */
  async restore(
    storage: IStorageProvider,
    snapshot: StateSnapshot,
  ): Promise<void> {
    const errors: Error[] = [];

    for (const [path, content] of snapshot.files.entries()) {
      try {
        await storage.writeFile(path, content);
      } catch (error) {
        const error_ =
          error instanceof Error ? error : new Error(String(error));
        this.logger.error("Failed to restore file", error_);
        errors.push(error_);
      }
    }

    this.logger.info("State restored from snapshot", {
      files: snapshot.files.size,
      errors: errors.length,
    });

    if (errors.length > 0) {
      throw new Error(
        `Restore completed with ${errors.length} error(s): ${errors
          .map((error_) => error_.message)
          .join(", ")}`,
      );
    }
  }
}
