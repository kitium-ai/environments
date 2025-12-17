import { PathResolver } from "../../../shared/helpers/path-resolver.js";
import type { IStorageProvider } from "../../../shared/interfaces/storage.interface.js";

/**
 * WorkspaceContext value object
 * Encapsulates workspace-related configuration and utilities
 * Eliminates scattered `options.cwd ?? process.cwd()` patterns
 */
export class WorkspaceContext {
  readonly cwd: string;
  readonly pathResolver: PathResolver;

  constructor(
    cwd: string = process.cwd(),
    private readonly storage: IStorageProvider | undefined,
  ) {
    this.cwd = cwd;
    this.pathResolver = new PathResolver(cwd);
  }

  /**
   * Get storage provider if available
   */
  getStorage(): IStorageProvider | undefined {
    return this.storage;
  }

  /**
   * Create a new context with different storage provider
   */
  withStorage(storage: IStorageProvider): WorkspaceContext {
    return new WorkspaceContext(this.cwd, storage);
  }

  /**
   * Create a new context with different working directory
   */
  withCwd(cwd: string): WorkspaceContext {
    return new WorkspaceContext(cwd, this.storage);
  }

  /**
   * Get context as serializable object (useful for logging/debugging)
   */
  toJSON(): Record<string, unknown> {
    return {
      cwd: this.cwd,
      hasStorage: this.storage !== undefined,
    };
  }
}
