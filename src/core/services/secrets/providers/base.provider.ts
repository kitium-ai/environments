import type {
  HealthStatus,
  ISecretProvider,
  SecretProviderConfig,
  SecretValue,
} from "../../../../shared/interfaces/secret-provider.interface.js";

/**
 * Base abstract class for secret providers
 * Provides common functionality for all secret provider implementations
 */
export abstract class BaseSecretProvider implements ISecretProvider {
  /**
   * Provider name (must be implemented by subclasses)
   */
  abstract readonly name: string;

  /**
   * Check if this provider supports the given provider type
   */
  abstract supports(providerType: string): boolean;

  /**
   * Fetch a secret from this provider (must be implemented by subclasses)
   */
  abstract fetch(config: SecretProviderConfig): Promise<SecretValue>;

  /**
   * Rotate a secret (optional, default implementation throws not supported)
   */
  rotate(_config: SecretProviderConfig): Promise<void> {
    return Promise.reject(
      new Error(`Rotation not supported for provider: ${this.name}`),
    );
  }

  /**
   * Check provider health (must be implemented by subclasses)
   */
  abstract healthCheck(): Promise<HealthStatus>;

  /**
   * Helper: Create secret value from components
   */
  protected createSecretValue(
    key: string,
    value: string,
    version?: string,
    expiresAt?: Date,
  ): SecretValue {
    const secret: SecretValue = {
      key,
      value,
      createdAt: new Date(),
      ...(version !== undefined ? { version } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    };

    return secret;
  }

  /**
   * Helper: Validate configuration
   */
  protected validateConfig(
    config: SecretProviderConfig,
    requiredFields: string[],
  ): void {
    for (const field of requiredFields) {
      if (!config[field as keyof SecretProviderConfig]) {
        throw new Error(
          `Missing required field in secret provider config: ${field}`,
        );
      }
    }
  }
}
