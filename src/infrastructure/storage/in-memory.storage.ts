import type { IStorageProvider } from "../../shared/interfaces/storage.interface.js";

/**
 * In-memory storage provider for testing
 * Stores all data in memory without touching the filesystem
 */
export class InMemoryStorageProvider implements IStorageProvider {
  private readonly files: Map<string, string> = new Map();
  private readonly directories: Set<string> = new Set();

  readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      const error = new Error(
        `ENOENT: no such file or directory, open '${path}'`,
      );
      (error as unknown as Record<string, unknown>)["code"] = "ENOENT";
      return Promise.reject(error);
    }
    return Promise.resolve(content);
  }

  writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    return Promise.resolve();
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path) || this.directories.has(path));
  }

  mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (!options?.recursive && !this.directories.has(path)) {
      // Check parent exists
      const parent = path.substring(0, path.lastIndexOf("/"));
      if (parent && !this.directories.has(parent)) {
        const error = new Error(
          `ENOENT: no such file or directory, mkdir '${path}'`,
        );
        (error as unknown as Record<string, unknown>)["code"] = "ENOENT";
        return Promise.reject(error);
      }
    }
    this.directories.add(path);
    return Promise.resolve();
  }

  readdir(path: string): Promise<string[]> {
    if (!this.directories.has(path)) {
      const error = new Error(
        `ENOENT: no such file or directory, scandir '${path}'`,
      );
      (error as unknown as Record<string, unknown>)["code"] = "ENOENT";
      return Promise.reject(error);
    }

    const result: string[] = [];
    const prefix = path.endsWith("/") ? path : `${path}/`;

    for (const file of this.files.keys()) {
      if (file.startsWith(prefix)) {
        const relative = file.substring(prefix.length);
        if (!relative.includes("/")) {
          result.push(relative);
        }
      }
    }

    return Promise.resolve(result);
  }

  rm(
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ): Promise<void> {
    if (this.directories.has(path)) {
      if (!options?.recursive) {
        const error = new Error(
          `EISDIR: illegal operation on a directory, unlink '${path}'`,
        );
        (error as unknown as Record<string, unknown>)["code"] = "EISDIR";
        return Promise.reject(error);
      }
      this.directories.delete(path);
      // Delete all files under this directory
      const prefix = path.endsWith("/") ? path : `${path}/`;
      for (const file of this.files.keys()) {
        if (file.startsWith(prefix)) {
          this.files.delete(file);
        }
      }
    } else if (this.files.has(path)) {
      this.files.delete(path);
    } else if (!options?.force) {
      const error = new Error(
        `ENOENT: no such file or directory, unlink '${path}'`,
      );
      (error as unknown as Record<string, unknown>)["code"] = "ENOENT";
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  /**
   * Reset storage for testing purposes
   */
  reset(): void {
    this.files.clear();
    this.directories.clear();
  }
}
