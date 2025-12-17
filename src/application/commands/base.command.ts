import type {
  CommandArguments,
  CommandResult,
  ICommand,
} from "../../shared/interfaces/command.interface.js";
import type { ValidationResult } from "../../shared/interfaces/validator.interface.js";

/**
 * Base command implementation
 * Provides common functionality for all commands
 */
export abstract class BaseCommand implements ICommand {
  abstract readonly name: string;
  abstract readonly description: string;

  /**
   * Execute the command (must be implemented by subclasses)
   */
  abstract execute(args: CommandArguments): Promise<CommandResult>;

  /**
   * Validate arguments (default: no validation)
   */
  validate(_args: CommandArguments): ValidationResult {
    return { isValid: true, errors: [] };
  }

  /**
   * Helper: Create successful result
   */
  protected successResult(message?: string, data?: unknown): CommandResult {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Helper: Create error result
   */
  protected errorResult(message: string, error?: Error): CommandResult {
    return {
      success: false,
      message,
      error,
    };
  }
}
