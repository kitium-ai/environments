import { loadSpec } from "../../../config.js";
import { getEnvkitLogger } from "../../../logger.js";
import type {
  CommandArguments,
  CommandResult,
} from "../../../shared/interfaces/command.interface.js";
import { createSnapshot } from "../../../snapshot.js";
import { BaseCommand } from "../base.command.js";

const DEFAULT_SPEC = "envkit.yaml";

/**
 * Snapshot command handler
 * Creates deterministic lockfile for the current spec
 */
export class SnapshotCommand extends BaseCommand {
  readonly name = "snapshot";
  readonly description = "Create deterministic lockfile for the current spec";
  private readonly logger = getEnvkitLogger({ component: "snapshot-command" });

  async execute(args: CommandArguments): Promise<CommandResult> {
    try {
      const cwd = (args["cwd"] as string) ?? process.cwd();
      const specPath = (args["path"] as string) ?? DEFAULT_SPEC;

      this.logger.info("Loading spec", { path: specPath });
      const spec = await loadSpec(specPath, { cwd });

      this.logger.info("Creating snapshot", { environment: spec.name });
      const snapshot = await createSnapshot(spec, { cwd });

      const message = `Snapshot created with fingerprint: ${snapshot.fingerprint}`;
      this.logger.info(message);

      return this.successResult(message, snapshot);
    } catch (error) {
      this.logger.error(
        "Snapshot command failed",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(
        `Snapshot creation failed: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
