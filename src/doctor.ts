import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { DOCTOR_REPORT_FILE } from './constants';
import { ensureStateDirectories, writeJson } from './state';
import { DoctorCheckResult, DoctorReport, EnvironmentSpec } from './types';
import { StructuredLogger } from './logger';

const execAsync = promisify(exec);

export interface DoctorOptions {
  cwd?: string;
}

export async function runDoctor(spec: EnvironmentSpec, options: DoctorOptions = {}): Promise<DoctorReport> {
  const cwd = options.cwd ?? process.cwd();
  const logger = new StructuredLogger(cwd);
  await ensureStateDirectories(cwd);

  const results: DoctorCheckResult[] = [];
  if (spec.checks && spec.checks.length > 0) {
    for (const command of spec.checks) {
      const started = Date.now();
      try {
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 15000 });
        results.push({
          command,
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          durationMs: Date.now() - started,
        });
      } catch (error) {
        const execError = error as { stdout?: string; stderr?: string; message: string };
        results.push({
          command,
          success: false,
          stdout: (execError.stdout ?? '').toString().trim(),
          stderr: (execError.stderr ?? execError.message ?? '').toString().trim(),
          durationMs: Date.now() - started,
        });
      }
    }
  }

  const passed = results.filter((result) => result.success).length;
  const report: DoctorReport = {
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      timestamp: new Date().toISOString(),
    },
    results,
  };

  const reportPath = path.join(cwd, DOCTOR_REPORT_FILE);
  await writeJson(reportPath, report);
  await logger.log('info', 'Doctor checks completed', { passed, failed: report.summary.failed });
  return report;
}
