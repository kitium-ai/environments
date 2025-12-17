import { loadSpec } from "../../../config.js";
import { getEnvkitLogger } from "../../../logger.js";
import { provisionEnvironment } from "../../../provision.js";
import type {
  CommandArguments,
  CommandResult,
} from "../../../shared/interfaces/command.interface.js";
import { BaseCommand } from "../base.command.js";

const DEFAULT_SPEC = "envkit.yaml";

/**
 * Provision command handler
 * Provisions toolchains and secrets defined in envkit.yaml
 */
export class ProvisionCommand extends BaseCommand {
  readonly name = "provision";
  readonly description =
    "Provision toolchains and secrets defined in envkit.yaml";
  private readonly logger = getEnvkitLogger({ component: "provision-command" });

  async execute(args: CommandArguments): Promise<CommandResult> {
    try {
      const cwd = (args["cwd"] as string) ?? process.cwd();
      const specPath = (args["path"] as string) ?? DEFAULT_SPEC;

      this.logger.info("Loading spec", { path: specPath });
      const spec = await loadSpec(specPath, { cwd });

      this.logger.info("Provisioning environment", { environment: spec.name });
      await provisionEnvironment(spec, { cwd });

      const message = `Successfully provisioned environment: ${spec.name}`;
      this.logger.info(message);

      return this.successResult(message);
    } catch (error) {
      this.logger.error(
        "Provision command failed",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(
        `Provisioning failed: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
