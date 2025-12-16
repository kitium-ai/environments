import { getEnvkitLogger } from './logger.js';
import type { EnvironmentSpec, SecretProvider } from './types.js';

export type SecretsOptions = {
  cwd?: string;
};

export class SecretsBroker {
  private readonly providers: SecretProvider[];
  private readonly logger: ReturnType<typeof getEnvkitLogger>;

  constructor(spec: EnvironmentSpec, options: SecretsOptions = {}) {
    this.providers = spec.secrets ?? [];
    this.logger = getEnvkitLogger({
      component: 'secrets',
      environment: spec.name,
      cwd: options.cwd ?? process.cwd(),
    });
  }

  fetchAll(): Record<string, string> {
    const results: Record<string, string> = {};
    for (const provider of this.providers) {
      const key = `${provider.provider}:${provider.path}`;
      results[key] = `placeholder-secret-for-${key}`;
      this.logger.info('Secret fetched', { provider: provider.provider, path: provider.path });
    }
    return results;
  }
}
