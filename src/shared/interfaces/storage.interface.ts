/**
 * Storage provider interface for file system operations
 * Enables abstraction from filesystem implementation for better testability
 */
export type IStorageProvider = {
  /**
   * Read file contents as UTF-8 string
   */
  readFile(path: string): Promise<string>;

  /**
   * Write file contents (overwrites if exists)
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Check if file or directory exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Create directory (optionally recursive)
   */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;

  /**
   * List directory contents
   */
  readdir(path: string): Promise<string[]>;

  /**
   * Remove file or directory
   */
  rm(
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ): Promise<void>;
};

/**
 * JSON storage abstraction for type-safe JSON operations
 */
export type IJsonStorage = {
  /**
   * Read and parse JSON file
   */
  read<T>(path: string): Promise<T>;

  /**
   * Write and stringify data to JSON file
   */
  write<T>(path: string, data: T): Promise<void>;
};
