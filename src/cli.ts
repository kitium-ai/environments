#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { toKitiumError } from "@kitiumai/error";
import { Command } from "commander";

import { CommandRegistry } from "./application/commands/command.registry.js";
import { DestroyCommand } from "./application/commands/handlers/destroy.command.js";
import { DoctorCommand } from "./application/commands/handlers/doctor.command.js";
import { InitCommand } from "./application/commands/handlers/init.command.js";
import { ProvisionCommand } from "./application/commands/handlers/provision.command.js";
import { SecretsCommand } from "./application/commands/handlers/secrets.command.js";
import { SnapshotCommand } from "./application/commands/handlers/snapshot.command.js";
import { getEnvkitLogger } from "./logger.js";

const DEFAULT_SPEC = "envkit.yaml";

/**
 * Initialize and register all commands
 */
function initializeCommands(): CommandRegistry {
  const registry = new CommandRegistry();

  registry.registerMultiple([
    new InitCommand(),
    new DoctorCommand(),
    new ProvisionCommand(),
    new SnapshotCommand(),
    new DestroyCommand(),
    new SecretsCommand(),
  ]);

  return registry;
}

/**
 * Main CLI entry point
 */
export async function main(): Promise<void> {
  const program = new Command();
  program
    .name("envkit")
    .description("Environment toolkit for reproducible, policy-aware setups")
    .option("-p, --path <path>", "Path to envkit spec", DEFAULT_SPEC);

  const registry = initializeCommands();
  const logger = getEnvkitLogger({ component: "cli" });

  // Dynamically register commander commands from registry
  for (const command of registry.getAll()) {
    const cmd = program.command(command.name).description(command.description);

    // Add command-specific options
    if (command.name === "destroy") {
      cmd.option("--preserve-logs", "Keep envkit logs", false);
    }

    cmd.action(async (commandOptions) => {
      try {
        const globalOptions = program.opts();
        const args = {
          path: globalOptions["path"],
          cwd: process.cwd(),
          ...commandOptions,
        };

        const result = await registry.execute(command.name, args);

        if (result.success) {
          if (result.message) {
            console.info(result.message);
          }
          if (result.data) {
            console.info(JSON.stringify(result.data, null, 2));
          }
        } else {
          console.error(`Error: ${result.message}`);
          if (result.error) {
            logger.error("Command execution error", result.error);
          }
          process.exitCode = 1;
        }
      } catch (error) {
        logger.error(
          "Unexpected error",
          error instanceof Error ? error : undefined,
        );
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
  }

  await program.parseAsync(process.argv);
}

const isCliEntry =
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

async function runCli(): Promise<void> {
  try {
    await main();
  } catch (error) {
    const kitiumError = toKitiumError(error, {
      code: "envkit/cli_error",
      message: "An error occurred while running envkit CLI",
      severity: "error",
      kind: "internal",
      retryable: false,
      source: "@kitiumai/envkit",
    });
    console.error(kitiumError.message);
    if (kitiumError.cause) {
      console.error("Cause:", kitiumError.cause);
    }
    process.exitCode = 1;
  }
}

if (isCliEntry) {
  void runCli();
}
