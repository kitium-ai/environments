import path from "node:path";

import { LAST_APPLIED_FILE } from "./constants.js";
import { getEnvkitLogger } from "./logger.js";
import { ensureStateDirectories, writeJson } from "./state.js";
import type { EnvironmentSpec } from "./types.js";

export type ProvisionOptions = {
  cwd?: string;
};

export async function provisionEnvironment(
  spec: EnvironmentSpec,
  options: ProvisionOptions = {},
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const logger = getEnvkitLogger({
    component: "provision",
    environment: spec.name,
  });
  await ensureStateDirectories(cwd);

  const state = {
    appliedAt: new Date().toISOString(),
    toolchains: spec.toolchains ?? [],
    secrets: spec.secrets ?? [],
    policies: spec.policies ?? [],
    name: spec.name,
  };
  const lastAppliedPath = path.join(cwd, LAST_APPLIED_FILE);
  await writeJson(lastAppliedPath, state);
  logger.info("Environment provisioned", state);
}
