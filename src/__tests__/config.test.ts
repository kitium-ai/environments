import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { loadSpec, fingerprintSpec } from '../config.js';
import { EnvironmentSpec } from '../types.js';
import { KitiumError } from '@kitiumai/error';

describe('config', () => {
  const testDir = path.join(process.cwd(), '.test-envkit-config');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadSpec', () => {
    it('should load valid YAML spec', async () => {
      const specPath = path.join(testDir, 'test.yaml');
      const content = `name: test-env
description: Test environment
toolchains:
  - name: node
    version: "20"
checks:
  - node --version
`;
      await fs.writeFile(specPath, content, 'utf-8');

      const spec = await loadSpec(specPath);
      expect(spec.name).toBe('test-env');
      expect(spec.description).toBe('Test environment');
      expect(spec.toolchains).toHaveLength(1);
      expect(spec.toolchains?.[0].name).toBe('node');
      expect(spec.checks).toHaveLength(1);
    });

    it('should load valid JSON spec', async () => {
      const specPath = path.join(testDir, 'test.json');
      const spec: EnvironmentSpec = {
        name: 'test-env',
        description: 'Test environment',
        toolchains: [{ name: 'python', version: '3.11' }],
      };
      await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

      const loaded = await loadSpec(specPath);
      expect(loaded.name).toBe('test-env');
      expect(loaded.toolchains).toHaveLength(1);
    });

    it('should handle relative paths', async () => {
      const specPath = path.join(testDir, 'test.yaml');
      const content = 'name: relative-test';
      await fs.writeFile(specPath, content, 'utf-8');

      const spec = await loadSpec('test.yaml', { cwd: testDir });
      expect(spec.name).toBe('relative-test');
    });

    it('should throw KitiumError for missing spec', async () => {
      const specPath = path.join(testDir, 'nonexistent.yaml');

      await expect(loadSpec(specPath)).rejects.toThrow(KitiumError);
      await expect(loadSpec(specPath)).rejects.toThrow(/spec_not_found/);
    });

    it('should throw KitiumError for invalid YAML', async () => {
      const specPath = path.join(testDir, 'invalid.yaml');
      await fs.writeFile(specPath, 'invalid: yaml: content:', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(KitiumError);
      await expect(loadSpec(specPath)).rejects.toThrow(/spec_parse_error/);
    });

    it('should throw KitiumError for invalid JSON', async () => {
      const specPath = path.join(testDir, 'invalid.json');
      await fs.writeFile(specPath, '{ invalid json }', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(KitiumError);
    });

    it('should throw KitiumError for spec without name', async () => {
      const specPath = path.join(testDir, 'no-name.yaml');
      await fs.writeFile(specPath, 'description: Missing name', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(KitiumError);
      await expect(loadSpec(specPath)).rejects.toThrow(/requires a valid name/);
    });

    it('should throw KitiumError for non-object spec', async () => {
      const specPath = path.join(testDir, 'array.json');
      await fs.writeFile(specPath, '[]', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(KitiumError);
      await expect(loadSpec(specPath)).rejects.toThrow(/must be an object/);
    });
  });

  describe('fingerprintSpec', () => {
    it('should generate consistent fingerprint for same spec', () => {
      const spec: EnvironmentSpec = {
        name: 'test',
        toolchains: [{ name: 'node', version: '20' }],
      };

      const fp1 = fingerprintSpec(spec);
      const fp2 = fingerprintSpec(spec);
      expect(fp1).toBe(fp2);
    });

    it('should generate different fingerprints for different specs', () => {
      const spec1: EnvironmentSpec = { name: 'test1' };
      const spec2: EnvironmentSpec = { name: 'test2' };

      const fp1 = fingerprintSpec(spec1);
      const fp2 = fingerprintSpec(spec2);
      expect(fp1).not.toBe(fp2);
    });

    it('should generate same fingerprint regardless of property order', () => {
      const spec1: EnvironmentSpec = {
        name: 'test',
        description: 'desc',
        toolchains: [],
      };
      const spec2: EnvironmentSpec = {
        toolchains: [],
        name: 'test',
        description: 'desc',
      };

      const fp1 = fingerprintSpec(spec1);
      const fp2 = fingerprintSpec(spec2);
      expect(fp1).toBe(fp2);
    });

    it('should return a 64-character hex string', () => {
      const spec: EnvironmentSpec = { name: 'test' };
      const fp = fingerprintSpec(spec);
      expect(fp).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
