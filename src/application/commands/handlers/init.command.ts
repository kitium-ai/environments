import { promises as fs } from "node:fs";
import path from "node:path";

import { getEnvkitLogger } from "../../../logger.js";
import type {
  CommandArguments,
  CommandResult,
} from "../../../shared/interfaces/command.interface.js";
import { ensureStateDirectories } from "../../../state.js";
import { BaseCommand } from "../base.command.js";

const DEFAULT_SPEC = "envkit.yaml";
const SAMPLE_SPEC_CONTENT = `name: sample-service
description: Local + CI environment with reproducible toolchains and secrets
secrets:
  - provider: vault
    path: kv/services/sample-service
    rotationDays: 30
toolchains:
  - name: node
    version: "20"
  - name: python
    version: "3.11"
policies:
  - policies/baseline.rego
checks:
  - node --version
  - npm --version
`;

/**
 * Init command handler
 * Creates starter envkit.yaml spec and state directories
 */
export class InitCommand extends BaseCommand {
  readonly name = "init";
  readonly description =
    "Create a starter envkit.yaml spec and state directories";
  private readonly logger = getEnvkitLogger({ component: "init-command" });

  async execute(args: CommandArguments): Promise<CommandResult> {
    try {
      const cwd = (args["cwd"] as string) ?? process.cwd();
      const specPath = (args["path"] as string) ?? DEFAULT_SPEC;
      const fullPath = path.isAbsolute(specPath)
        ? specPath
        : path.join(cwd, specPath);

      // Ensure state directories
      await ensureStateDirectories(cwd);

      // Write sample spec
      await fs.writeFile(fullPath, SAMPLE_SPEC_CONTENT, "utf-8");

      this.logger.info(`Initialized spec at ${fullPath}`);
      return this.successResult(`Initialized spec at ${fullPath}`);
    } catch (error) {
      this.logger.error(
        "Init command failed",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(
        `Failed to initialize spec: ${message}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
