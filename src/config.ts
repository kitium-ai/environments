import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { parse as parseYaml } from 'yaml';
import { EnvironmentSpec } from './types';

export interface LoadSpecOptions {
  cwd?: string;
}

export function fingerprintSpec(spec: EnvironmentSpec): string {
  const stable = JSON.stringify(spec, Object.keys(spec).sort());
  return createHash('sha256').update(stable).digest('hex');
}

export async function loadSpec(specPath: string, options: LoadSpecOptions = {}): Promise<EnvironmentSpec> {
  const cwd = options.cwd ?? process.cwd();
  const fullPath = path.isAbsolute(specPath) ? specPath : path.join(cwd, specPath);
  const raw = await fs.readFile(fullPath, 'utf-8');
  const parsed = parseContent(raw, specPath);
  validateSpec(parsed);
  return parsed;
}

function parseContent(raw: string, specPath: string): EnvironmentSpec {
  const extension = path.extname(specPath).toLowerCase();
  if (extension === '.json') {
    return JSON.parse(raw) as EnvironmentSpec;
  }
  return parseYaml(raw) as EnvironmentSpec;
}

function validateSpec(spec: EnvironmentSpec): void {
  if (!spec || typeof spec !== 'object') {
    throw new Error('Environment spec must be an object.');
  }
  if (!spec.name) {
    throw new Error('Environment spec requires a name.');
  }
}
