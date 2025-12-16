import { promises as fs } from 'node:fs';
import path from 'node:path';

import { NotFoundError, ValidationError } from '@kitiumai/error';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fingerprintSpec, loadSpec } from '../config.js';
import type { EnvironmentSpec } from '../types.js';

describe('config', () => {
  const testDirectory = path.join(process.cwd(), '.test-envkit-config');

  beforeEach(async () => {
    await fs.mkdir(testDirectory, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  describe('loadSpec', () => {
    it('should load valid YAML spec', async () => {
      const specPath = path.join(testDirectory, 'test.yaml');
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
      expect(spec.toolchains?.[0]?.name).toBe('node');
      expect(spec.checks).toHaveLength(1);
    });

    it('should load valid JSON spec', async () => {
      const specPath = path.join(testDirectory, 'test.json');
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
      const specPath = path.join(testDirectory, 'test.yaml');
      const content = 'name: relative-test';
      await fs.writeFile(specPath, content, 'utf-8');

      const spec = await loadSpec('test.yaml', { cwd: testDirectory });
      expect(spec.name).toBe('relative-test');
    });

    it('should throw NotFoundError for missing spec', async () => {
      const specPath = path.join(testDirectory, 'nonexistent.yaml');

      await expect(loadSpec(specPath)).rejects.toThrow(NotFoundError);
      await expect(loadSpec(specPath)).rejects.toThrow(/spec_not_found/);
    });

    it('should throw ValidationError for invalid YAML', async () => {
      const specPath = path.join(testDirectory, 'invalid.yaml');
      await fs.writeFile(specPath, 'invalid: yaml: content:', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(ValidationError);
      await expect(loadSpec(specPath)).rejects.toThrow(/spec_parse_error/);
    });

    it('should throw ValidationError for invalid JSON', async () => {
      const specPath = path.join(testDirectory, 'invalid.json');
      await fs.writeFile(specPath, '{ invalid json }', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for spec without name', async () => {
      const specPath = path.join(testDirectory, 'no-name.yaml');
      await fs.writeFile(specPath, 'description: Missing name', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(ValidationError);
      await expect(loadSpec(specPath)).rejects.toThrow(/requires a valid name/);
    });

    it('should throw ValidationError for non-object spec', async () => {
      const specPath = path.join(testDirectory, 'array.json');
      await fs.writeFile(specPath, '[]', 'utf-8');

      await expect(loadSpec(specPath)).rejects.toThrow(ValidationError);
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
