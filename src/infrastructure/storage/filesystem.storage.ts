import { promises as fs } from "node:fs";

import type {
  IJsonStorage,
  IStorageProvider,
} from "../../shared/interfaces/storage.interface.js";

/**
 * Filesystem-based storage provider
 * Implements actual file system operations
 */
export class FilesystemStorageProvider implements IStorageProvider {
  readFile(path: string): Promise<string> {
    return fs.readFile(path, "utf-8");
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fs.writeFile(path, content, "utf-8");
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await fs.mkdir(path, options);
  }

  readdir(path: string): Promise<string[]> {
    return fs.readdir(path);
  }

  async rm(
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ): Promise<void> {
    await fs.rm(path, options);
  }
}

/**
 * JSON storage implementation using filesystem storage
 */
export class JsonFileStorage implements IJsonStorage {
  constructor(private readonly storage: IStorageProvider) {}

  async read<T>(path: string): Promise<T> {
    const content = await this.storage.readFile(path);
    return JSON.parse(content) as T;
  }

  async write<T>(path: string, data: T): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await this.storage.writeFile(path, content);
  }
}
