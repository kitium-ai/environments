import path from 'path';
import { SNAPSHOT_FILE } from './constants.js';
import { fingerprintSpec } from './config.js';
import { EnvironmentSpec, Snapshot } from './types.js';
import { ensureStateDirectories, writeJson } from './state.js';
import { getEnvkitLogger } from './logger.js';

export interface SnapshotOptions {
  cwd?: string;
}

export async function createSnapshot(
  spec: EnvironmentSpec,
  options: SnapshotOptions = {}
): Promise<Snapshot> {
  const cwd = options.cwd ?? process.cwd();
  await ensureStateDirectories(cwd);
  const logger = getEnvkitLogger({ component: 'snapshot', environment: spec.name });

  const snapshot: Snapshot = {
    spec,
    fingerprint: fingerprintSpec(spec),
    createdAt: new Date().toISOString(),
  };

  const snapshotPath = path.join(cwd, SNAPSHOT_FILE);
  await writeJson(snapshotPath, snapshot);
  logger.info('Snapshot created', { fingerprint: snapshot.fingerprint });
  return snapshot;
}
