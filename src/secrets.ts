/* eslint-disable sonarjs/cognitive-complexity, max-depth */
import { getEnvkitLogger } from "./logger.js";
import {
  AWSSecretsProvider,
  AzureSecretsProvider,
  GCPSecretsProvider,
  type SecretsProvider,
  VaultSecretsProvider,
} from "./providers/secrets.js";
import type { EnvironmentSpec, SecretProvider } from "./types.js";

export type SecretsOptions = {
  cwd?: string;
  providers?: Record<string, SecretsProvider>;
};

export class SecretsBroker {
  private readonly providers: SecretProvider[];
  private readonly secretsProviders: Map<string, SecretsProvider>;
  private readonly logger: ReturnType<typeof getEnvkitLogger>;

  constructor(spec: EnvironmentSpec, options: SecretsOptions = {}) {
    this.providers = spec.secrets ?? [];
    this.secretsProviders = new Map(Object.entries(options.providers ?? {}));
    this.logger = getEnvkitLogger({
      component: "secrets",
      environment: spec.name,
      cwd: options.cwd ?? process.cwd(),
    });

    // Initialize default providers if not provided
    this.initializeDefaultProviders();
  }

  private initializeDefaultProviders(): void {
    this.tryRegisterVaultProvider();
    this.tryRegisterAwsProvider();
    this.tryRegisterAzureProvider();
    this.tryRegisterGcpProvider();
  }

  private tryRegisterVaultProvider(): void {
    if (this.secretsProviders.has("vault")) {
      return;
    }

    const vaultToken = process.env["VAULT_TOKEN"];
    const vaultAddr = process.env["VAULT_ADDR"];
    if (!vaultToken || !vaultAddr) {
      return;
    }

    const namespace = process.env["VAULT_NAMESPACE"];
    this.secretsProviders.set(
      "vault",
      new VaultSecretsProvider({
        endpoint: vaultAddr,
        token: vaultToken,
        ...(namespace !== undefined ? { namespace } : {}),
      }),
    );
  }

  private tryRegisterAwsProvider(): void {
    if (this.secretsProviders.has("aws")) {
      return;
    }

    const awsRegion = process.env["AWS_REGION"] ?? process.env["AWS_DEFAULT_REGION"];
    const awsAccessKeyId = process.env["AWS_ACCESS_KEY_ID"];
    const awsSecretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
    if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey) {
      return;
    }

    this.secretsProviders.set(
      "aws",
      new AWSSecretsProvider({
        region: awsRegion,
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      }),
    );
  }

  private tryRegisterAzureProvider(): void {
    if (this.secretsProviders.has("azure")) {
      return;
    }

    const azureVaultUrl = process.env["AZURE_KEYVAULT_URL"];
    const azureClientId = process.env["AZURE_CLIENT_ID"];
    const azureClientSecret = process.env["AZURE_CLIENT_SECRET"];
    const azureTenantId = process.env["AZURE_TENANT_ID"];
    if (!azureVaultUrl || !azureClientId || !azureClientSecret || !azureTenantId) {
      return;
    }

    this.secretsProviders.set(
      "azure",
      new AzureSecretsProvider({
        vaultUrl: azureVaultUrl,
        clientId: azureClientId,
        clientSecret: azureClientSecret,
        tenantId: azureTenantId,
      }),
    );
  }

  private tryRegisterGcpProvider(): void {
    if (this.secretsProviders.has("gcp")) {
      return;
    }

    const gcpProjectId = process.env["GCP_PROJECT_ID"] ?? process.env["GOOGLE_CLOUD_PROJECT"];
    if (!gcpProjectId) {
      return;
    }

    const keyFilename = process.env["GOOGLE_APPLICATION_CREDENTIALS"];
    this.secretsProviders.set(
      "gcp",
      new GCPSecretsProvider({
        projectId: gcpProjectId,
        ...(keyFilename !== undefined ? { keyFilename } : {}),
      }),
    );
  }

  async fetchAll(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const provider of this.providers) {
      try {
        const secretsProvider = this.secretsProviders.get(provider.provider);
        if (secretsProvider) {
          const secretValue = await secretsProvider.fetchSecret(provider.path);
          results[`${provider.provider}:${provider.path}`] = secretValue;
          this.logger.info("Secret fetched successfully", {
            provider: provider.provider,
            path: provider.path,
          });
        } else {
          this.logger.warn("Secrets provider not configured", {
            provider: provider.provider,
            path: provider.path,
          });
          // Fallback to placeholder for backward compatibility
          results[`${provider.provider}:${provider.path}`] =
            `placeholder-secret-for-${provider.provider}:${provider.path}`;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          "Failed to fetch secret",
          error instanceof Error ? error : undefined,
          {
            provider: provider.provider,
            path: provider.path,
            error: errorMessage,
          },
        );
        throw error;
      }
    }

    return results;
  }

  async rotateSecrets(): Promise<void> {
    for (const provider of this.providers) {
      if (provider.rotationDays && provider.rotationDays > 0) {
        try {
          const secretsProvider = this.secretsProviders.get(provider.provider);
          if (secretsProvider?.rotateSecret) {
            await secretsProvider.rotateSecret(provider.path);
            this.logger.info("Secret rotated successfully", {
              provider: provider.provider,
              path: provider.path,
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            "Failed to rotate secret",
            error instanceof Error ? error : undefined,
            {
              provider: provider.provider,
              path: provider.path,
              error: errorMessage,
            },
          );
          throw error;
        }
      }
    }
  }

  getProvider(providerName: string): SecretsProvider | undefined {
    return this.secretsProviders.get(providerName);
  }

  registerProvider(provider: SecretsProvider): void {
    this.secretsProviders.set(provider.name, provider);
  }
}
