import { getEnvkitLogger } from "../../logger.js";
import type {
  CommandArguments,
  CommandResult,
  ICommand,
} from "../../shared/interfaces/command.interface.js";

/**
 * Command Registry implementing Command pattern
 * Enables registration and execution of commands without tight coupling
 * Supports extensibility: add commands without modifying CLI
 */
export class CommandRegistry {
  private readonly commands: Map<string, ICommand> = new Map();
  private readonly logger = getEnvkitLogger({ component: "command-registry" });

  /**
   * Register a command
   */
  register(command: ICommand): void {
    if (this.commands.has(command.name)) {
      this.logger.warn("Overwriting existing command", {
        command: command.name,
      });
    }
    this.commands.set(command.name, command);
    this.logger.info("Registered command", { command: command.name });
  }

  /**
   * Register multiple commands at once
   */
  registerMultiple(commands: ICommand[]): void {
    for (const command of commands) {
      this.register(command);
    }
  }

  /**
   * Check if command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Get a command by name
   */
  get(name: string): ICommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Execute a command
   */
  async execute(name: string, args: CommandArguments): Promise<CommandResult> {
    const command = this.commands.get(name);
    if (!command) {
      return {
        success: false,
        message: `Command not found: ${name}`,
      };
    }

    try {
      // Validate arguments
      const validation = command.validate(args);
      if (!validation.isValid) {
        const errors = validation.errors
          .map(
            (errorDetail) =>
              `${errorDetail.field ?? errorDetail.code}: ${errorDetail.message}`,
          )
          .join(", ");
        return {
          success: false,
          message: `Validation failed: ${errors}`,
        };
      }

      // Execute command
      this.logger.info("Executing command", { command: name });
      const result = await command.execute(args);

      if (result.success) {
        this.logger.info("Command succeeded", { command: name });
      } else {
        this.logger.warn("Command failed", {
          command: name,
          message: result.message,
        });
      }

      return result;
    } catch (error) {
      this.logger.error(
        "Command execution error",
        error instanceof Error ? error : undefined,
      );
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Command execution error: ${message}`,
        error: error instanceof Error ? error : new Error(message),
      };
    }
  }

  /**
   * Get all registered commands
   */
  getAll(): ICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command names
   */
  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
  }
}
