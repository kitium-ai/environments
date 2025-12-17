/**
 * Configuration for a secret provider
 */
export type SecretProviderConfig = {
  provider: string;
  path: string;
  rotationDays?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Secret value with metadata
 */
export type SecretValue = {
  key: string;
  value: string;
  version?: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
};

/**
 * Health status of a provider
 */
export type HealthStatus = {
  healthy: boolean;
  message?: string;
  lastCheck?: Date;
  latencyMs?: number;
};

/**
 * Secret provider interface using Strategy pattern
 * Enables support for multiple secret backends (Vault, AWS Secrets Manager, etc.)
 */
export type ISecretProvider = {
  /**
   * Provider name (e.g., 'vault', 'aws-secrets', 'local')
   */
  readonly name: string;

  /**
   * Check if this provider supports the given provider type
   */
  supports(providerType: string): boolean;

  /**
   * Fetch a secret from this provider
   */
  fetch(config: SecretProviderConfig): Promise<SecretValue>;

  /**
   * Rotate a secret (refresh/regenerate)
   */
  rotate(config: SecretProviderConfig): Promise<void>;

  /**
   * Check provider health and connectivity
   */
  healthCheck(): Promise<HealthStatus>;
};
