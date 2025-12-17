import path from "node:path";

/**
 * Centralized path resolution utility
 * Eliminates duplicated path.join() calls throughout the codebase
 */
export class PathResolver {
  constructor(private readonly baseDirectory: string = process.cwd()) {}

  /**
   * Resolve a path relative to base directory
   * Converts relative paths to absolute paths
   */
  resolve(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.baseDirectory, filePath);
  }

  /**
   * Join path segments and resolve relative to base directory
   */
  join(...segments: string[]): string {
    const joined = path.join(...segments);
    return this.resolve(joined);
  }

  /**
   * Get filename from path
   */
  basename(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * Get directory name from path
   */
  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Get file extension
   */
  extname(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Check if path is absolute
   */
  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Get relative path from base to target
   */
  relative(targetPath: string): string {
    return path.relative(this.baseDirectory, targetPath);
  }
}
