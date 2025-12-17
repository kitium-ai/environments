import type {
  HealthStatus,
  SecretProviderConfig,
  SecretValue,
} from "../../../../shared/interfaces/secret-provider.interface.js";
import { BaseSecretProvider } from "./base.provider.js";

/**
 * Local secret provider for development
 * Stores secrets in a local encrypted storage (or plain for development)
 */
export class LocalSecretProvider extends BaseSecretProvider {
  readonly name = "local";
  private readonly secrets: Map<string, SecretValue> = new Map();

  override supports(providerType: string): boolean {
    return providerType.toLowerCase() === "local";
  }

  override fetch(config: SecretProviderConfig): Promise<SecretValue> {
    this.validateConfig(config, ["path"]);

    const key = `${config.provider}:${config.path}`;
    const cached = this.secrets.get(key);

    if (cached) {
      // Check if expired
      if (cached.expiresAt && cached.expiresAt < new Date()) {
        this.secrets.delete(key);
        return Promise.reject(new Error(`Secret expired: ${key}`));
      }
      return Promise.resolve(cached);
    }

    // For local provider in development, generate a placeholder
    // In production, this would load from encrypted storage
    const secret = this.createSecretValue(
      key,
      `local-secret-value-${Date.now()}`,
      "1.0",
      config.rotationDays
        ? new Date(Date.now() + config.rotationDays * 24 * 60 * 60 * 1000)
        : undefined,
    );

    this.secrets.set(key, secret);
    return Promise.resolve(secret);
  }

  override rotate(config: SecretProviderConfig): Promise<void> {
    this.validateConfig(config, ["path"]);
    const key = `${config.provider}:${config.path}`;
    this.secrets.delete(key);
    return Promise.resolve();
  }

  override healthCheck(): Promise<HealthStatus> {
    return Promise.resolve({
      healthy: true,
      message: "Local secret provider ready",
      lastCheck: new Date(),
      latencyMs: 0,
    });
  }

  /**
   * Set a secret directly (for testing)
   */
  setSecret(key: string, value: SecretValue): void {
    this.secrets.set(key, value);
  }

  /**
   * Clear all secrets (for testing)
   */
  clear(): void {
    this.secrets.clear();
  }
}
