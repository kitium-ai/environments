import { promises as fs } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSnapshot } from '../snapshot.js';
import { pathExists } from '../state.js';
import type { EnvironmentSpec } from '../types.js';

describe('snapshot', () => {
  const testDirectory = path.join(process.cwd(), '.test-envkit-snapshot');

  beforeEach(async () => {
    await fs.mkdir(testDirectory, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  describe('createSnapshot', () => {
    it('should create snapshot with fingerprint', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        toolchains: [{ name: 'node', version: '20' }],
      };

      const snapshot = await createSnapshot(spec, { cwd: testDirectory });

      expect(snapshot.spec).toEqual(spec);
      expect(snapshot.fingerprint).toBeDefined();
      expect(snapshot.fingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(snapshot.createdAt).toBeDefined();
    });

    it('should write snapshot to file', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
      };

      await createSnapshot(spec, { cwd: testDirectory });

      const snapshotPath = path.join(testDirectory, '.envkit', 'envkit.lock.json');
      const isSnapshotPresent = await pathExists(snapshotPath);
      expect(isSnapshotPresent).toBe(true);

      const content = await fs.readFile(snapshotPath, 'utf-8');
      const snapshot = JSON.parse(content);
      expect(snapshot.spec.name).toBe('test-env');
    });

    it('should include createdAt timestamp', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
      };

      const before = new Date().getTime();
      const snapshot = await createSnapshot(spec, { cwd: testDirectory });
      const after = new Date().getTime();

      const createdAt = new Date(snapshot.createdAt).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
    });

    it('should generate consistent fingerprint for same spec', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        toolchains: [{ name: 'node', version: '20' }],
      };

      const snapshot1 = await createSnapshot(spec, { cwd: testDirectory });

      // Create in a different directory to avoid file conflicts
      const testDir2 = path.join(process.cwd(), '.test-envkit-snapshot2');
      await fs.mkdir(testDir2, { recursive: true });
      const snapshot2 = await createSnapshot(spec, { cwd: testDir2 });
      await fs.rm(testDir2, { recursive: true, force: true });

      expect(snapshot1.fingerprint).toBe(snapshot2.fingerprint);
    });

    it('should preserve complete spec in snapshot', async () => {
      const spec: EnvironmentSpec = {
        name: 'complex-env',
        description: 'Complex environment',
        toolchains: [
          { name: 'node', version: '20', cacheKey: 'node-v20' },
          { name: 'python', version: '3.11' },
        ],
        secrets: [{ provider: 'vault', path: 'kv/prod', rotationDays: 30 }],
        policies: ['baseline.rego', 'production.rego'],
        checks: ['node --version', 'python --version'],
      };

      const snapshot = await createSnapshot(spec, { cwd: testDirectory });

      expect(snapshot.spec).toEqual(spec);
      expect(snapshot.spec.toolchains).toHaveLength(2);
      expect(snapshot.spec.secrets).toHaveLength(1);
      expect(snapshot.spec.policies).toHaveLength(2);
      expect(snapshot.spec.checks).toHaveLength(2);
    });

    it('should create state directories if they do not exist', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
      };

      await createSnapshot(spec, { cwd: testDirectory });

      const stateDir = path.join(testDirectory, '.envkit');
      const isStateDirectoryPresent = await pathExists(stateDir);
      expect(isStateDirectoryPresent).toBe(true);
    });
  });
});
