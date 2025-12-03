import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { provisionEnvironment } from '../provision.js';
import { EnvironmentSpec } from '../types.js';

describe('provision', () => {
  const testDir = path.join(process.cwd(), '.test-envkit-provision');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
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

      await provisionEnvironment(spec, { cwd: testDir });

      const statePath = path.join(testDir, '.envkit', 'last-applied.json');
      const exists = await fs
        .access(statePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

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

      await provisionEnvironment(spec, { cwd: testDir });

      const statePath = path.join(testDir, '.envkit', 'last-applied.json');
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
      await provisionEnvironment(spec, { cwd: testDir });
      const after = new Date().getTime();

      const statePath = path.join(testDir, '.envkit', 'last-applied.json');
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

      await provisionEnvironment(spec, { cwd: testDir });

      const stateDir = path.join(testDir, '.envkit');
      const diagnosticsDir = path.join(testDir, '.envkit', 'diagnostics');

      const stateDirExists = await fs
        .access(stateDir)
        .then(() => true)
        .catch(() => false);
      const diagnosticsDirExists = await fs
        .access(diagnosticsDir)
        .then(() => true)
        .catch(() => false);

      expect(stateDirExists).toBe(true);
      expect(diagnosticsDirExists).toBe(true);
    });

    it('should preserve toolchain metadata', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        toolchains: [{ name: 'node', version: '20', cacheKey: 'custom-key' }],
      };

      await provisionEnvironment(spec, { cwd: testDir });

      const statePath = path.join(testDir, '.envkit', 'last-applied.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.toolchains[0].cacheKey).toBe('custom-key');
    });

    it('should preserve secret rotation days', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        secrets: [{ provider: 'vault', path: 'kv/test', rotationDays: 30 }],
      };

      await provisionEnvironment(spec, { cwd: testDir });

      const statePath = path.join(testDir, '.envkit', 'last-applied.json');
      const content = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.secrets[0].rotationDays).toBe(30);
    });
  });
});
