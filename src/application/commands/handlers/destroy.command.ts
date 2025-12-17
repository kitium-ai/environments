import { promises as fs } from "node:fs";
import path from "node:path";

import { STATE_DIR } from "../../../constants.js";
import { getEnvkitLogger } from "../../../logger.js";
import type {
  CommandArguments,
  CommandResult,
} from "../../../shared/interfaces/command.interface.js";
import { BaseCommand } from "../base.command.js";

/**
 * Destroy command handler
 * Removes envkit state from the current workspace
 */
export class DestroyCommand extends BaseCommand {
  readonly name = "destroy";
  readonly description = "Remove envkit state from the current workspace";
  private readonly logger = getEnvkitLogger({ component: "destroy-command" });

  private async listStateEntries(stateDirectory: string): Promise<string[]> {
    try {
      return await fs.readdir(stateDirectory);
    } catch {
      return [];
    }
  }

  private async removeStateEntry(
    stateDirectory: string,
    entry: string,
    shouldPreserveLogs: boolean,
  ): Promise<void> {
    if (shouldPreserveLogs && entry === "envkit.log") {
      return;
    }
    await fs.rm(path.join(stateDirectory, entry), {
      recursive: true,
      force: true,
    });
  }

  async execute(args: CommandArguments): Promise<CommandResult> {
    try {
      const cwd = (args["cwd"] as string) ?? process.cwd();
      const shouldPreserveLogs = (args["preserveLogs"] as boolean) ?? false;
      const stateDirectory = path.join(cwd, STATE_DIR);

      const entries = await this.listStateEntries(stateDirectory);

      for (const entry of entries) {
        await this.removeStateEntry(stateDirectory, entry, shouldPreserveLogs);
      }

      const message = `Destroyed envkit state${shouldPreserveLogs ? " (keeping logs)" : ""}`;
      this.logger.warn(message, { preserveLogs: shouldPreserveLogs });

      return this.successResult(message);
    } catch (error) {
      this.logger.error(
        "Destroy command failed",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(
        `Destroy failed: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
