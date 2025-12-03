import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { ensureStateDirectories, writeJson, pathExists, readJson } from '../state.js';

describe('state', () => {
  const testDir = path.join(process.cwd(), '.test-envkit-state');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('ensureStateDirectories', () => {
    it('should create state and diagnostics directories', async () => {
      await ensureStateDirectories(testDir);

      const stateDir = path.join(testDir, '.envkit');
      const diagnosticsDir = path.join(testDir, '.envkit', 'diagnostics');

      const stateDirExists = await pathExists(stateDir);
      const diagnosticsDirExists = await pathExists(diagnosticsDir);

      expect(stateDirExists).toBe(true);
      expect(diagnosticsDirExists).toBe(true);
    });

    it('should not fail if directories already exist', async () => {
      await ensureStateDirectories(testDir);
      await ensureStateDirectories(testDir); // Call again

      const stateDir = path.join(testDir, '.envkit');
      const exists = await pathExists(stateDir);
      expect(exists).toBe(true);
    });

    it('should use current working directory by default', async () => {
      const cwd = process.cwd();
      await ensureStateDirectories();

      const stateDir = path.join(cwd, '.envkit');
      const exists = await pathExists(stateDir);
      expect(exists).toBe(true);

      // Cleanup
      await fs.rm(stateDir, { recursive: true, force: true });
    });
  });

  describe('writeJson', () => {
    it('should write JSON data to file', async () => {
      const filePath = path.join(testDir, 'test.json');
      const data = { name: 'test', value: 123 };

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(testDir, 'nested', 'deep', 'test.json');
      const data = { test: true };

      await writeJson(filePath, data);

      const exists = await pathExists(filePath);
      expect(exists).toBe(true);
    });

    it('should format JSON with indentation', async () => {
      const filePath = path.join(testDir, 'formatted.json');
      const data = { name: 'test', nested: { value: 123 } };

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('\n');
      expect(content).toContain('  '); // Should have indentation
    });

    it('should handle arrays', async () => {
      const filePath = path.join(testDir, 'array.json');
      const data = [1, 2, 3, { name: 'test' }];

      await writeJson(filePath, data);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });
  });

  describe('pathExists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(testDir, 'exists.txt');
      await fs.writeFile(filePath, 'content', 'utf-8');

      const exists = await pathExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const filePath = path.join(testDir, 'does-not-exist.txt');

      const exists = await pathExists(filePath);
      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const dirPath = path.join(testDir, 'subdir');
      await fs.mkdir(dirPath, { recursive: true });

      const exists = await pathExists(dirPath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing directory', async () => {
      const dirPath = path.join(testDir, 'non-existent-dir');

      const exists = await pathExists(dirPath);
      expect(exists).toBe(false);
    });
  });

  describe('readJson', () => {
    it('should read and parse JSON file', async () => {
      const filePath = path.join(testDir, 'data.json');
      const data = { name: 'test', value: 456 };
      await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');

      const result = await readJson(filePath);
      expect(result).toEqual(data);
    });

    it('should preserve types', async () => {
      interface TestData {
        str: string;
        num: number;
        bool: boolean;
        arr: number[];
      }

      const filePath = path.join(testDir, 'typed.json');
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
      const filePath = path.join(testDir, 'invalid.json');
      await fs.writeFile(filePath, '{ invalid json }', 'utf-8');

      await expect(readJson(filePath)).rejects.toThrow();
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(testDir, 'missing.json');

      await expect(readJson(filePath)).rejects.toThrow();
    });
  });
});
