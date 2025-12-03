import path from 'path';
import { LAST_APPLIED_FILE } from './constants';
import { EnvironmentSpec } from './types';
import { ensureStateDirectories, writeJson } from './state';
import { StructuredLogger } from './logger';

export interface ProvisionOptions {
  cwd?: string;
}

export async function provisionEnvironment(spec: EnvironmentSpec, options: ProvisionOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const logger = new StructuredLogger(cwd);
  await ensureStateDirectories(cwd);

  const state = {
    appliedAt: new Date().toISOString(),
    toolchains: spec.toolchains ?? [],
    secrets: spec.secrets ?? [],
    policies: spec.policies ?? [],
    name: spec.name,
  };
  const lastAppliedPath = path.join(cwd, LAST_APPLIED_FILE);
  await writeJson(lastAppliedPath, state);
  await logger.log('info', 'Environment provisioned', state);
}
