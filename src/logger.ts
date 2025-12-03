import { promises as fs } from 'fs';
import path from 'path';
import { LOG_FILE } from './constants';
import { ensureStateDirectories } from './state';

export type LogLevel = 'info' | 'warn' | 'error';

export class StructuredLogger {
  constructor(private readonly baseDir = process.cwd()) {}

  async log(level: LogLevel, message: string, details: Record<string, unknown> = {}): Promise<void> {
    await ensureStateDirectories(this.baseDir);
    const timestamp = new Date().toISOString();
    const entry = { level, message, timestamp, ...details };
    const logLine = `${JSON.stringify(entry)}\n`;
    const fullPath = path.join(this.baseDir, LOG_FILE);
    await fs.appendFile(fullPath, logLine, 'utf-8');
    if (level === 'error') {
      console.error(`[envkit] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[envkit] ${message}`);
    } else {
      console.log(`[envkit] ${message}`);
    }
  }
}
