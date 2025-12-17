import { loadSpec } from "../../../config.js";
import { runDoctor } from "../../../doctor.js";
import { getEnvkitLogger } from "../../../logger.js";
import type {
  CommandArguments,
  CommandResult,
} from "../../../shared/interfaces/command.interface.js";
import { BaseCommand } from "../base.command.js";

const DEFAULT_SPEC = "envkit.yaml";

/**
 * Doctor command handler
 * Runs environment health checks defined in envkit.yaml
 */
export class DoctorCommand extends BaseCommand {
  readonly name = "doctor";
  readonly description = "Run environment health checks defined in envkit.yaml";
  private readonly logger = getEnvkitLogger({ component: "doctor-command" });

  async execute(args: CommandArguments): Promise<CommandResult> {
    try {
      const cwd = (args["cwd"] as string) ?? process.cwd();
      const specPath = (args["path"] as string) ?? DEFAULT_SPEC;

      this.logger.info("Loading spec", { path: specPath });
      const spec = await loadSpec(specPath, { cwd });

      this.logger.info("Running health checks", { environment: spec.name });
      const report = await runDoctor(spec, { cwd });

      const summary = `Doctor check complete: ${report.summary.passed}/${report.summary.total} passed`;
      this.logger.info(summary);

      return this.successResult(summary, report);
    } catch (error) {
      this.logger.error(
        "Doctor command failed",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(
        `Doctor check failed: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
