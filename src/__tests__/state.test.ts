import { promises as fs } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureStateDirectories, pathExists, readJson, writeJson } from '../state.js';

describe('state', () => {
  const testDirectory = path.join(process.cwd(), '.test-envkit-state');

  beforeEach(async () => {
    await fs.mkdir(testDirectory, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  describe('ensureStateDirectories', () => {
    it('should create state and diagnostics directories', async () => {
      await ensureStateDirectories(testDirectory);

      const stateDir = path.join(testDirectory, '.envkit');
      const diagnosticsDir = path.join(testDirectory, '.envkit', 'diagnostics');

      const isStateDirectoryPresent = await pathExists(stateDir);
      const isDiagnosticsDirectoryPresent = await pathExists(diagnosticsDir);

      expect(isStateDirectoryPresent).toBe(true);
      expect(isDiagnosticsDirectoryPresent).toBe(true);
    });

    it('should not fail if directories already exist', async () => {
      await ensureStateDirectories(testDirectory);
      await ensureStateDirectories(testDirectory); // Call again

      const stateDir = path.join(testDirectory, '.envkit');
      const isStateDirectoryPresent = await pathExists(stateDir);
      expect(isStateDirectoryPresent).toBe(true);
    });

    it('should use current working directory by default', async () => {
      const cwd = process.cwd();
      await ensureStateDirectories();

      const stateDir = path.join(cwd, '.envkit');
      const isStateDirectoryPresent = await pathExists(stateDir);
      expect(isStateDirectoryPresent).toBe(true);

      // Cleanup
      await fs.rm(stateDir, { recursive: true, force: true });
    });
  });

  describe('writeJson', () => {
    it('should write JSON data to file', async () => {
      const filePath = path.join(testDirectory, 'test.json');
      const data = { name: 'test', value: 123 };

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(testDirectory, 'nested', 'deep', 'test.json');
      const data = { test: true };

      await writeJson(filePath, data);

      const isFilePresent = await pathExists(filePath);
      expect(isFilePresent).toBe(true);
    });

    it('should format JSON with indentation', async () => {
      const filePath = path.join(testDirectory, 'formatted.json');
      const data = { name: 'test', nested: { value: 123 } };

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  '); // Should have indentation
    });

    it('should handle arrays', async () => {
      const filePath = path.join(testDirectory, 'array.json');
      const data = [1, 2, 3, { name: 'test' }];

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDirectory, 'exists.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const isFilePresent = await pathExists(filePath);
      expect(isFilePresent).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(testDirectory, 'does-not-exist.txt');

      const isFilePresent = await pathExists(filePath);
      expect(isFilePresent).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const directoryPath = path.join(testDirectory, 'subdir');
      await fs.mkdir(directoryPath, { recursive: true });

      const isDirectoryPresent = await pathExists(directoryPath);
      expect(isDirectoryPresent).toBe(true);
    });

    it('should return false for non-existing directory', async () => {
      const directoryPath = path.join(testDirectory, 'non-existent-dir');

      const isDirectoryPresent = await pathExists(directoryPath);
      expect(isDirectoryPresent).toBe(false);
    });
  });

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const filePath = path.join(testDirectory, 'data.json');
      const data = { name: 'test', value: 456 };
      await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');

      const result = await readJson(filePath);
      expect(result).toEqual(data);
    });

    it('should preserve types', async () => {
      type TestData = {
        str: string;
        num: number;
        bool: boolean;
        arr: number[];
      };

      const filePath = path.join(testDirectory, 'typed.json');
      const data: TestData = {
        str: 'hello',
        num: 123,
        bool: true,
        arr: [1, 2, 3],
      };
      await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');

      const result = await readJson<TestData>(filePath);
      expect(result.str).toBe('hello');
      expect(result.num).toBe(123);
      expect(result.bool).toBe(true);
      expect(result.arr).toEqual([1, 2, 3]);
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDirectory, 'invalid.json');
      await fs.writeFile(filePath, '{ invalid json }', 'utf-8');

      await expect(readJson(filePath)).rejects.toThrow();
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(testDirectory, 'missing.json');

      await expect(readJson(filePath)).rejects.toThrow();
    });
  });
});
