import { promises as fs } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runDoctor } from '../doctor.js';
import { pathExists } from '../state.js';
import type { EnvironmentSpec } from '../types.js';

describe('doctor', () => {
  const testDirectory = path.join(process.cwd(), '.test-envkit-doctor');

  beforeEach(async () => {
    await fs.mkdir(testDirectory, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  describe('runDoctor', () => {
    it('should run successful checks', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        checks: ['echo "hello"', 'node --version'],
      };

      const report = await runDoctor(spec, { cwd: testDirectory });

      expect(report.summary.total).toBe(2);
      expect(report.summary.passed).toBe(2);
      expect(report.summary.failed).toBe(0);
      expect(report.results).toHaveLength(2);
      expect(report.results[0]?.success).toBe(true);
      expect(report.results[0]?.stdout).toBe('hello');
    });

    it('should handle failed checks', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        checks: ['exit 1', 'echo "success"'],
      };

      const report = await runDoctor(spec, { cwd: testDirectory });

      expect(report.summary.total).toBe(2);
      expect(report.summary.passed).toBe(1);
      expect(report.summary.failed).toBe(1);
      expect(report.results[0]?.success).toBe(false);
      expect(report.results[1]?.success).toBe(true);
    });

    it('should handle spec with no checks', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
      };

      const report = await runDoctor(spec, { cwd: testDirectory });

      expect(report.summary.total).toBe(0);
      expect(report.summary.passed).toBe(0);
      expect(report.summary.failed).toBe(0);
      expect(report.results).toHaveLength(0);
    });

    it('should record command execution duration', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        checks: ['echo "test"'],
      };

      const report = await runDoctor(spec, { cwd: testDirectory });

      expect(report.results[0]?.durationMs).toBeGreaterThan(0);
      expect(report.results[0]?.durationMs).toBeLessThan(5000);
    });

    it('should create report file', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        checks: ['echo "test"'],
      };

      await runDoctor(spec, { cwd: testDirectory });

      const reportPath = path.join(testDirectory, '.envkit', 'diagnostics', 'doctor.json');
      const isReportPresent = await pathExists(reportPath);
      expect(isReportPresent).toBe(true);

      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);
      expect(report.summary).toBeDefined();
      expect(report.results).toBeDefined();
    });

    it('should include timestamp in report', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        checks: ['echo "test"'],
      };

      const report = await runDoctor(spec, { cwd: testDirectory });

      expect(report.summary.timestamp).toBeDefined();
      expect(new Date(report.summary.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should capture stdout and stderr', async () => {
      const spec: EnvironmentSpec = {
        name: 'test-env',
        checks: ['echo "stdout" && echo "stderr" >&2'],
      };

      const report = await runDoctor(spec, { cwd: testDirectory });

      expect(report.results[0]?.stdout).toBe('stdout');
      expect(report.results[0]?.stderr).toBe('stderr');
    });
  });
});
