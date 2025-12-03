import { promises as fs } from 'fs';
import path from 'path';
import { DIAGNOSTICS_DIR, STATE_DIR } from './constants.js';

export async function ensureStateDirectories(baseDir = process.cwd()): Promise<void> {
  const dirs = [STATE_DIR, DIAGNOSTICS_DIR];
  await Promise.all(
    dirs.map(async (relativePath) => {
      const fullPath = path.join(baseDir, relativePath);
      await fs.mkdir(fullPath, { recursive: true });
    })
  );
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T> {
  const buffer = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(buffer) as T;
}
