import { promises as fs } from "node:fs";
import path from "node:path";

import { DIAGNOSTICS_DIR, STATE_DIR } from "./constants.js";

export async function ensureStateDirectories(
  baseDirectory = process.cwd(),
): Promise<void> {
  const directories = [STATE_DIR, DIAGNOSTICS_DIR];
  await Promise.all(
    directories.map(async (relativePath) => {
      const fullPath = path.join(baseDirectory, relativePath);
      await fs.mkdir(fullPath, { recursive: true });
    }),
  );
}

export async function writeJson(
  filePath: string,
  data: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
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
  const buffer = await fs.readFile(filePath, "utf-8");
  return JSON.parse(buffer) as T;
}
