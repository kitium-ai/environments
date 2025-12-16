import { promises as fs } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provisionEnvironment } from '../provision.js';
import { pathExists } from '../state.js';
import type { EnvironmentSpec } from '../types.js';

describe('provision', () => {
  const testDirectory = path.join(process.cwd(), '.test-envkit-provision');

  beforeEach(async () => {
    await fs.mkdir(testDirectory, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  describe('provisionEnvironment', () => {
    it('should create state file with provision information', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        toolchains: [
          { name: 'node', version: '20' },
          { name: 'python', version: '3.11' },
        ],
        secrets: [{ provider: 'vault', path: 'kv/test' }],
        policies: ['policy1.rego', 'policy2.rego'],
      };

      await provisionEnvironment(spec, { cwd: testDirectory });

      const statePath = path.join(testDirectory, '.envkit', 'last-applied.json');
      const isStatePresent = await pathExists(statePath);
      expect(isStatePresent).toBe(true);

      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.name).toBe('test-env');
      expect(state.toolchains).toHaveLength(2);
      expect(state.secrets).toHaveLength(1);
      expect(state.policies).toHaveLength(2);
      expect(state.appliedAt).toBeDefined();
    });

    it('should handle spec with minimal fields', async () => {
      const spec: EnvironmentSpec = {
        name: 'minimal-env',
      };

      await provisionEnvironment(spec, { cwd: testDirectory });

      const statePath = path.join(testDirectory, '.envkit', 'last-applied.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.name).toBe('minimal-env');
      expect(state.toolchains).toEqual([]);
      expect(state.secrets).toEqual([]);
      expect(state.policies).toEqual([]);
    });

    it('should include appliedAt timestamp', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
      };

      const before = new Date().getTime();
      await provisionEnvironment(spec, { cwd: testDirectory });
      const after = new Date().getTime();

      const statePath = path.join(testDirectory, '.envkit', 'last-applied.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      const appliedAt = new Date(state.appliedAt).getTime();
      expect(appliedAt).toBeGreaterThanOrEqual(before);
      expect(appliedAt).toBeLessThanOrEqual(after);
    });

    it('should create state directories if they do not exist', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
      };

      await provisionEnvironment(spec, { cwd: testDirectory });

      const stateDir = path.join(testDirectory, '.envkit');
      const diagnosticsDir = path.join(testDirectory, '.envkit', 'diagnostics');

      const isStateDirectoryPresent = await pathExists(stateDir);
      const isDiagnosticsDirectoryPresent = await pathExists(diagnosticsDir);

      expect(isStateDirectoryPresent).toBe(true);
      expect(isDiagnosticsDirectoryPresent).toBe(true);
    });

    it('should preserve toolchain metadata', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        toolchains: [{ name: 'node', version: '20', cacheKey: 'custom-key' }],
      };

      await provisionEnvironment(spec, { cwd: testDirectory });

      const statePath = path.join(testDirectory, '.envkit', 'last-applied.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.toolchains[0].cacheKey).toBe('custom-key');
    });

    it('should preserve secret rotation days', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        secrets: [{ provider: 'vault', path: 'kv/test', rotationDays: 30 }],
      };

      await provisionEnvironment(spec, { cwd: testDirectory });

      const statePath = path.join(testDirectory, '.envkit', 'last-applied.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.secrets[0].rotationDays).toBe(30);
    });
  });
});
