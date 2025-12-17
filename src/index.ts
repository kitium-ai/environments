// Legacy API (Facade pattern - still works, backward compatible)
export * from "./cli.js";
export * from "./config.js";
export * from "./constants.js";
export * from "./doctor.js";
export * from "./logger.js";
export * from "./plugins.js";
export * from "./provision.js";
export * from "./secrets.js";
export * from "./snapshot.js";
export * from "./state.js";
export * from "./types.js";

// New Layered Architecture API (Phase 1-9)

// Shared Interfaces
export type {
  CommandArguments,
  CommandOption,
  CommandResult,
  ICommand,
} from "./shared/interfaces/command.interface.js";
export type {
  HealthStatus,
  ISecretProvider,
  SecretProviderConfig,
  SecretValue,
} from "./shared/interfaces/secret-provider.interface.js";
export type {
  IJsonStorage,
  IStorageProvider,
} from "./shared/interfaces/storage.interface.js";
export type {
  IValidator,
  ValidationError,
  ValidationResult,
} from "./shared/interfaces/validator.interface.js";

// Shared Helpers
export { PathResolver } from "./shared/helpers/path-resolver.js";

// Core Domain
export { WorkspaceContext } from "./core/domain/value-objects/workspace-context.js";

// Core Services
export { StateSnapshotManager } from "./core/services/provisioning/state-snapshot.js";
export { TransactionManager } from "./core/services/provisioning/transaction.manager.js";
export { SecretsBrokerService } from "./core/services/secrets/secrets-broker.service.js";

// Secret Providers
export { AwsSecretsManagerProvider } from "./core/services/secrets/providers/aws-secrets.provider.js";
export { BaseSecretProvider } from "./core/services/secrets/providers/base.provider.js";
export { LocalSecretProvider } from "./core/services/secrets/providers/local.provider.js";
export { VaultSecretProvider } from "./core/services/secrets/providers/vault.provider.js";

// Plugin System
export type { Plugin, PluginHooks } from "./core/plugins/plugin-manager.js";
export {
  getPluginManager,
  PluginManager,
} from "./core/plugins/plugin-manager.js";

// Infrastructure - Storage
export { FilesystemStorageProvider } from "./infrastructure/storage/filesystem.storage.js";
export { InMemoryStorageProvider } from "./infrastructure/storage/in-memory.storage.js";

// Infrastructure - Validation
export { ValidationPipeline } from "./infrastructure/validation/validation.pipeline.js";
export { PolicyValidator } from "./infrastructure/validation/validators/policy.validator.js";
export { SecretsValidator } from "./infrastructure/validation/validators/secrets.validator.js";
export { SpecNameValidator } from "./infrastructure/validation/validators/spec-name.validator.js";
export { ToolchainValidator } from "./infrastructure/validation/validators/toolchain.validator.js";

// Infrastructure - Logging
export type { RequestContext } from "./infrastructure/logging/context-manager.js";
export { ContextManager } from "./infrastructure/logging/context-manager.js";
export type { ContextualLogger } from "./infrastructure/logging/logger-factory.js";
export { LoggerFactory } from "./infrastructure/logging/logger-factory.js";

// Infrastructure - Resilience
export type { CircuitBreakerConfig } from "./infrastructure/resilience/circuit-breaker.js";
export {
  CircuitBreaker,
  CircuitBreakerState,
} from "./infrastructure/resilience/circuit-breaker.js";
export type { RetryConfig } from "./infrastructure/resilience/retry-decorator.js";
export { RetryDecorator } from "./infrastructure/resilience/retry-decorator.js";

// Application - Commands
export { BaseCommand } from "./application/commands/base.command.js";
export { CommandRegistry } from "./application/commands/command.registry.js";
export { DestroyCommand } from "./application/commands/handlers/destroy.command.js";
export { DoctorCommand } from "./application/commands/handlers/doctor.command.js";
export { InitCommand } from "./application/commands/handlers/init.command.js";
export { ProvisionCommand } from "./application/commands/handlers/provision.command.js";
export { SecretsCommand } from "./application/commands/handlers/secrets.command.js";
export { SnapshotCommand } from "./application/commands/handlers/snapshot.command.js";

// Application - DI
export { ServiceLocator } from "./application/di/service-locator.js";
