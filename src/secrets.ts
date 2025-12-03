import { EnvironmentSpec, SecretProvider } from './types';
import { StructuredLogger } from './logger';

export interface SecretsOptions {
  cwd?: string;
}

export class SecretsBroker {
  private readonly providers: SecretProvider[];
  private readonly logger: StructuredLogger;

  constructor(spec: EnvironmentSpec, options: SecretsOptions = {}) {
    this.providers = spec.secrets ?? [];
    this.logger = new StructuredLogger(options.cwd ?? process.cwd());
  }

  async fetchAll(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    for (const provider of this.providers) {
      const key = `${provider.provider}:${provider.path}`;
      results[key] = `placeholder-secret-for-${key}`;
      await this.logger.log('info', 'Secret fetched', { provider: provider.provider, path: provider.path });
    }
    return results;
  }
}
