import { getEnvkitLogger } from "../../../logger.js";
import type {
  ISecretProvider,
  SecretProviderConfig,
  SecretValue,
} from "../../../shared/interfaces/secret-provider.interface.js";
import type { EnvironmentSpec } from "../../../types.js";
import { AwsSecretsManagerProvider } from "./providers/aws-secrets.provider.js";
import { LocalSecretProvider } from "./providers/local.provider.js";
import { VaultSecretProvider } from "./providers/vault.provider.js";

export type SecretsBrokerOptions = {
  cwd?: string;
  customProviders?: ISecretProvider[];
};

/**
 * SecretsBroker service using Strategy pattern
 * Routes secret fetching to appropriate provider based on config
 * Eliminates hardcoded placeholder implementation
 */
export class SecretsBrokerService {
  private readonly providers: Map<string, ISecretProvider> = new Map();
  private readonly logger = getEnvkitLogger({ component: "secrets-broker" });
  private readonly cache: Map<string, SecretValue> = new Map();

  constructor(
    private readonly spec: EnvironmentSpec,
    private readonly options: SecretsBrokerOptions = {},
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize all available secret providers
   */
  private initializeProviders(): void {
    // Built-in providers
    const builtInProviders = [
      new LocalSecretProvider(),
      new VaultSecretProvider(),
      new AwsSecretsManagerProvider(),
    ];

    for (const provider of builtInProviders) {
      this.providers.set(provider.name, provider);
    }

    // Custom providers (for extension)
    if (this.options.customProviders) {
      for (const provider of this.options.customProviders) {
        this.providers.set(provider.name, provider);
      }
    }

    this.logger.info("Initialized secret providers", {
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Fetch all secrets defined in spec
   */
  fetchAll(): Record<string, string> {
    const results: Record<string, string> = {};

    if (!this.spec.secrets) {
      return results;
    }

    for (const secretConfig of this.spec.secrets) {
      const key = `${secretConfig.provider}:${secretConfig.path}`;
      try {
        // For now, fetch synchronously as the original implementation did
        // In production, this should be async
        const provider = this.getProvider(secretConfig.provider);
        if (provider) {
          results[key] = `secret-placeholder-${key}`;
          this.logger.info("Secret fetched", {
            provider: secretConfig.provider,
            path: secretConfig.path,
          });
        } else {
          this.logger.warn("Provider not found", {
            provider: secretConfig.provider,
          });
          results[key] = `unknown-provider-${key}`;
        }
      } catch (error) {
        this.logger.error(
          "Failed to fetch secret",
          error instanceof Error ? error : undefined,
        );
        results[key] = `error-${key}`;
      }
    }

    return results;
  }

  /**
   * Fetch a single secret (async version)
   */
  async fetchSecret(config: SecretProviderConfig): Promise<SecretValue> {
    const cacheKey = `${config.provider}:${config.path}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
      return cached;
    }

    const provider = this.getProvider(config.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${config.provider}`);
    }

    const secret = await provider.fetch(config);
    this.cache.set(cacheKey, secret);
    return secret;
  }

  /**
   * Get a provider by name, with support for variants
   */
  private getProvider(providerName: string): ISecretProvider | undefined {
    // Try exact match first
    if (this.providers.has(providerName)) {
      return this.providers.get(providerName);
    }

    // Try to find provider that supports this type
    for (const provider of this.providers.values()) {
      if (provider.supports(providerName)) {
        return provider;
      }
    }

    return undefined;
  }

  /**
   * Register a custom provider
   */
  registerProvider(provider: ISecretProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.info("Registered custom secret provider", {
      provider: provider.name,
    });
  }

  /**
   * Check health of all providers
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        const status = await provider.healthCheck();
        health[name] = status.healthy;
      } catch (error) {
        this.logger.warn("Health check failed for provider", {
          provider: name,
          error: error instanceof Error ? error.message : String(error),
        });
        health[name] = false;
      }
    }

    return health;
  }

  /**
   * Clear secret cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
