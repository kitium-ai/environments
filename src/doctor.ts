import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { timeout } from "@kitiumai/utils-ts";

import { DOCTOR_REPORT_FILE } from "./constants.js";
import { getEnvkitLogger } from "./logger.js";
import { ensureStateDirectories, writeJson } from "./state.js";
import type {
  DoctorCheckResult,
  DoctorReport,
  EnvironmentSpec,
} from "./types.js";

const execAsync = promisify(exec);

export type DoctorOptions = {
  cwd?: string;
};

async function executeDoctorCheck(
  command: string,
  cwd: string,
): Promise<DoctorCheckResult> {
  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await timeout(
      execAsync(command, { cwd }),
      15000,
      `Command execution timed out: ${command}`,
    );
    return {
      command,
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message: string;
    };
    return {
      command,
      success: false,
      stdout: (execError.stdout ?? "").toString().trim(),
      stderr: (execError.stderr ?? execError.message ?? "").toString().trim(),
      durationMs: Date.now() - startedAt,
    };
  }
}

export async function runDoctor(
  spec: EnvironmentSpec,
  options: DoctorOptions = {},
): Promise<DoctorReport> {
  const cwd = options.cwd ?? process.cwd();
  const logger = getEnvkitLogger({
    component: "doctor",
    environment: spec.name,
  });
  await ensureStateDirectories(cwd);

  const results: DoctorCheckResult[] = [];
  if (spec.checks && spec.checks.length > 0) {
    for (const command of spec.checks) {
      results.push(await executeDoctorCheck(command, cwd));
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
  logger.info("Doctor checks completed", {
    passed,
    failed: report.summary.failed,
  });
  return report;
}
