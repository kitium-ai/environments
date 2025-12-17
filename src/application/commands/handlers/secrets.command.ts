import { loadSpec } from "../../../config.js";
import { getEnvkitLogger } from "../../../logger.js";
import { SecretsBroker } from "../../../secrets.js";
import type {
  CommandArguments,
  CommandResult,
} from "../../../shared/interfaces/command.interface.js";
import { BaseCommand } from "../base.command.js";

const DEFAULT_SPEC = "envkit.yaml";

/**
 * Secrets command handler
 * Fetches all secrets via the configured broker
 */
export class SecretsCommand extends BaseCommand {
  readonly name = "secrets";
  readonly description = "Fetch all secrets via the configured broker";
  private readonly logger = getEnvkitLogger({ component: "secrets-command" });

  async execute(args: CommandArguments): Promise<CommandResult> {
    try {
      const cwd = (args["cwd"] as string) ?? process.cwd();
      const specPath = (args["path"] as string) ?? DEFAULT_SPEC;

      this.logger.info("Loading spec", { path: specPath });
      const spec = await loadSpec(specPath, { cwd });

      this.logger.info("Fetching secrets", { environment: spec.name });
      const broker = new SecretsBroker(spec, { cwd });
      const secrets = broker.fetchAll();

      const message = `Fetched ${Object.keys(secrets).length} secrets`;
      this.logger.info(message);

      return this.successResult(message, secrets);
    } catch (error) {
      this.logger.error(
        "Secrets command failed",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(
        `Failed to fetch secrets: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
