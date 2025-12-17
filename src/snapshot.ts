import path from "node:path";

import { fingerprintSpec } from "./config.js";
import { SNAPSHOT_FILE } from "./constants.js";
import { getEnvkitLogger } from "./logger.js";
import { ensureStateDirectories, writeJson } from "./state.js";
import type { EnvironmentSpec, Snapshot } from "./types.js";

export type SnapshotOptions = {
  cwd?: string;
};

export async function createSnapshot(
  spec: EnvironmentSpec,
  options: SnapshotOptions = {},
): Promise<Snapshot> {
  const cwd = options.cwd ?? process.cwd();
  await ensureStateDirectories(cwd);
  const logger = getEnvkitLogger({
    component: "snapshot",
    environment: spec.name,
  });

  const snapshot: Snapshot = {
    spec,
    fingerprint: fingerprintSpec(spec),
    createdAt: new Date().toISOString(),
  };

  const snapshotPath = path.join(cwd, SNAPSHOT_FILE);
  await writeJson(snapshotPath, snapshot);
  logger.info("Snapshot created", { fingerprint: snapshot.fingerprint });
  return snapshot;
}
