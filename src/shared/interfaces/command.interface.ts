import type { ValidationResult } from "./validator.interface.js";

/**
 * Command arguments passed from CLI
 */
export type CommandArguments = {
  [key: string]: unknown;
};

/**
 * Result from command execution
 */
export type CommandResult = {
  success: boolean;
  message?: string | undefined;
  data?: unknown | undefined;
  error?: Error | undefined;
};

/**
 * Command option configuration
 */
export type CommandOption = {
  name: string;
  description: string;
  defaultValue?: unknown;
  required?: boolean;
};

/**
 * Command interface using Command pattern
 * Enables decoupling CLI from business logic and extensibility
 */
export type ICommand = {
  /**
   * Unique command name (e.g., 'init', 'doctor', 'provision')
   */
  readonly name: string;

  /**
   * Human-readable command description
   */
  readonly description: string;

  /**
   * Available command options
   */
  readonly options?: CommandOption[];

  /**
   * Execute the command
   */
  execute(args: CommandArguments): Promise<CommandResult>;

  /**
   * Validate command arguments before execution
   */
  validate(args: CommandArguments): ValidationResult;
};
