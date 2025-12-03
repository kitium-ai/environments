import path from 'path';
import { SNAPSHOT_FILE } from './constants';
import { fingerprintSpec } from './config';
import { EnvironmentSpec, Snapshot } from './types';
import { ensureStateDirectories, writeJson } from './state';
import { StructuredLogger } from './logger';

export interface SnapshotOptions {
  cwd?: string;
}

export async function createSnapshot(spec: EnvironmentSpec, options: SnapshotOptions = {}): Promise<Snapshot> {
  const cwd = options.cwd ?? process.cwd();
  await ensureStateDirectories(cwd);
  const logger = new StructuredLogger(cwd);

  const snapshot: Snapshot = {
    spec,
    fingerprint: fingerprintSpec(spec),
    createdAt: new Date().toISOString(),
  };

  const snapshotPath = path.join(cwd, SNAPSHOT_FILE);
  await writeJson(snapshotPath, snapshot);
  await logger.log('info', 'Snapshot created', { fingerprint: snapshot.fingerprint });
  return snapshot;
}
