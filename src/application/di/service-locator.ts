import { TransactionManager } from "../../core/services/provisioning/transaction.manager.js";
import { FilesystemStorageProvider } from "../../infrastructure/storage/filesystem.storage.js";
import { ValidationPipeline } from "../../infrastructure/validation/validation.pipeline.js";
import { PolicyValidator } from "../../infrastructure/validation/validators/policy.validator.js";
import { SecretsValidator } from "../../infrastructure/validation/validators/secrets.validator.js";
import { SpecNameValidator } from "../../infrastructure/validation/validators/spec-name.validator.js";
import { ToolchainValidator } from "../../infrastructure/validation/validators/toolchain.validator.js";
import { getEnvkitLogger } from "../../logger.js";
import type { EnvironmentSpec } from "../../types.js";

/**
 * Service Locator (simple DI container)
 * Provides centralized access to services throughout the application
 */
export class ServiceLocator {
  private static instance: ServiceLocator;
  private readonly services: Map<string, unknown> = new Map();
  private readonly logger = getEnvkitLogger({ component: "service-locator" });

  private constructor() {
    this.registerDefaultServices();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }

  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    // Storage
    this.register("storage", new FilesystemStorageProvider());

    // Validation Pipeline
    const pipeline = new ValidationPipeline<EnvironmentSpec>();
    pipeline
      .addValidator(new SpecNameValidator())
      .addValidator(new ToolchainValidator())
      .addValidator(new SecretsValidator())
      .addValidator(new PolicyValidator());
    this.register("validationPipeline", pipeline);

    // Transaction Manager
    this.register("transactionManager", new TransactionManager());

    this.logger.info("Default services registered");
  }

  /**
   * Register a service
   */
  register<T>(key: string, service: T): void {
    this.services.set(key, service);
    this.logger.debug("Service registered", { service: key });
  }

  /**
   * Resolve a service
   */
  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }
    return service as T;
  }

  /**
   * Check if service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Get all registered service keys
   */
  keys(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Reset all services (for testing)
   */
  reset(): void {
    this.services.clear();
    this.registerDefaultServices();
    this.logger.info("Service locator reset");
  }
}
