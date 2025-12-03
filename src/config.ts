import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { parse as parseYaml } from 'yaml';
import { EnvironmentSpec } from './types.js';
import { createEnvkitError } from './logger.js';

// Type guard for object check
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface LoadSpecOptions {
  cwd?: string;
}

export function fingerprintSpec(spec: EnvironmentSpec): string {
  const stable = JSON.stringify(spec, Object.keys(spec).sort());
  return createHash('sha256').update(stable).digest('hex');
}

export async function loadSpec(
  specPath: string,
  options: LoadSpecOptions = {}
): Promise<EnvironmentSpec> {
  const cwd = options.cwd ?? process.cwd();
  const fullPath = path.isAbsolute(specPath) ? specPath : path.join(cwd, specPath);

  try {
    const raw = await fs.readFile(fullPath, 'utf-8');
    const parsed = parseContent(raw, specPath);
    validateSpec(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw createEnvkitError('spec_not_found', `Environment spec not found: ${fullPath}`, {
        cause: error,
        context: { specPath, fullPath },
      });
    }
    throw error;
  }
}

function parseContent(raw: string, specPath: string): EnvironmentSpec {
  const extension = path.extname(specPath).toLowerCase();
  try {
    if (extension === '.json') {
      return JSON.parse(raw) as EnvironmentSpec;
    }
    return parseYaml(raw) as EnvironmentSpec;
  } catch (error) {
    throw createEnvkitError('spec_parse_error', `Failed to parse environment spec: ${specPath}`, {
      cause: error as Error,
      context: { specPath, extension },
    });
  }
}

function validateSpec(spec: EnvironmentSpec): void {
  if (!isObject(spec)) {
    throw createEnvkitError('spec_invalid', 'Environment spec must be an object.');
  }
  if (!spec.name || typeof spec.name !== 'string') {
    throw createEnvkitError('spec_invalid', 'Environment spec requires a valid name string.');
  }
}
