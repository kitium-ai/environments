/* eslint-disable @typescript-eslint/require-await, require-await */
export type IntegrationType =
  | "webhook"
  | "api"
  | "plugin"
  | "extension"
  | "cli"
  | "ui";

export type IntegrationStatus = "active" | "inactive" | "error" | "pending";

export type IntegrationConfig = {
  id: string;
  name: string;
  type: IntegrationType;
  description?: string;
  version: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  metadata: IntegrationMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
};

export type IntegrationMetadata = {
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  dependencies?: string[];
  permissions?: string[];
};

export type WebhookIntegration = IntegrationConfig & {
  type: "webhook";
  config: {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    secret?: string;
    events: string[];
    retryPolicy?: RetryPolicy;
  };
};

export type ApiIntegration = IntegrationConfig & {
  type: "api";
  config: {
    baseUrl: string;
    auth: ApiAuth;
    endpoints: ApiEndpoint[];
    rateLimit?: RateLimit;
    timeout?: number;
  };
};

export type ApiAuth = {
  type: "none" | "basic" | "bearer" | "oauth2" | "api_key";
  config?: Record<string, unknown>;
};

export type ApiEndpoint = {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  description?: string;
  parameters?: ApiParameter[];
  responseSchema?: Record<string, unknown>;
};

export type ApiParameter = {
  name: string;
  type: "query" | "path" | "body" | "header";
  required: boolean;
  description?: string;
  schema?: Record<string, unknown>;
};

export type RateLimit = {
  requests: number;
  period: "second" | "minute" | "hour" | "day";
  strategy: "fixed_window" | "sliding_window" | "token_bucket";
};

export type RetryPolicy = {
  maxAttempts: number;
  backoffStrategy: "fixed" | "exponential" | "linear";
  baseDelayMs: number;
  maxDelayMs?: number;
};

export type PluginIntegration = IntegrationConfig & {
  type: "plugin";
  config: {
    entryPoint: string;
    hooks: PluginHook[];
    commands?: PluginCommand[];
    events?: PluginEvent[];
  };
};

export type PluginHook = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  returnType?: string;
};

export type PluginCommand = {
  name: string;
  description?: string;
  parameters?: PluginParameter[];
  handler: string;
};

export type PluginParameter = {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  default?: unknown;
};

export type PluginEvent = {
  name: string;
  description?: string;
  payloadSchema?: Record<string, unknown>;
};

export type ExtensionIntegration = IntegrationConfig & {
  type: "extension";
  config: {
    activationEvents: string[];
    contributes: ExtensionContribution;
    main: string;
  };
};

export type ExtensionContribution = {
  commands?: ExtensionCommand[];
  menus?: Record<string, ExtensionMenuItem[]>;
  views?: ExtensionView[];
  keybindings?: ExtensionKeybinding[];
};

export type ExtensionCommand = {
  command: string;
  title: string;
  category?: string;
  icon?: string;
};

export type ExtensionMenuItem = {
  command: string;
  when?: string;
  group?: string;
};

export type ExtensionView = {
  id: string;
  name: string;
  icon?: string;
  contextValue?: string;
};

export type ExtensionKeybinding = {
  command: string;
  key: string;
  when?: string;
  mac?: string;
  linux?: string;
  win?: string;
};

export type CliIntegration = IntegrationConfig & {
  type: "cli";
  config: {
    commands: CliCommand[];
    globalOptions?: CliOption[];
    help?: string;
  };
};

export type CliCommand = {
  name: string;
  description?: string;
  options?: CliOption[];
  arguments?: CliArgument[];
  subcommands?: CliCommand[];
  handler: string;
};

export type CliOption = {
  name: string;
  short?: string;
  description?: string;
  type: "string" | "boolean" | "number";
  required?: boolean;
  default?: unknown;
};

export type CliArgument = {
  name: string;
  description?: string;
  type: "string" | "number";
  required?: boolean;
};

export type UiIntegration = IntegrationConfig & {
  type: "ui";
  config: {
    components: UiComponent[];
    routes?: UiRoute[];
    themes?: UiTheme[];
    locales?: Record<string, Record<string, string>>;
  };
};

export type UiComponent = {
  name: string;
  type: "page" | "modal" | "widget" | "form";
  template: string;
  styles?: string;
  script?: string;
  props?: Record<string, unknown>;
};

export type UiRoute = {
  path: string;
  component: string;
  title?: string;
  icon?: string;
  requiresAuth?: boolean;
};

export type UiTheme = {
  name: string;
  colors: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
};

export type IntegrationProvider = {
  type: IntegrationType;
  validateConfig(config: Record<string, unknown>): Promise<ValidationResult>;
  initialize(config: Record<string, unknown>): Promise<IntegrationInstance>;
  execute(context: IntegrationContext): Promise<IntegrationResult>;
};

export type ValidationResult = {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
};

export type IntegrationInstance = {
  id: string;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  dispose(): Promise<void>;
};

export type IntegrationContext = {
  event?: string;
  payload?: unknown;
  environment?: string;
  user?: string;
  correlationId?: string;
};

export type IntegrationResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  logs?: string[];
};

export class IntegrationRegistry {
  private readonly providers: Map<IntegrationType, IntegrationProvider> =
    new Map();
  private readonly integrations: Map<string, IntegrationConfig> = new Map();
  private readonly instances: Map<string, IntegrationInstance> = new Map();

  registerProvider(type: IntegrationType, provider: IntegrationProvider): void {
    this.providers.set(type, provider);
  }

  unregisterProvider(type: IntegrationType): boolean {
    return this.providers.delete(type);
  }

  getProvider(type: IntegrationType): IntegrationProvider | undefined {
    return this.providers.get(type);
  }

  async registerIntegration(
    config: Omit<IntegrationConfig, "createdAt" | "updatedAt">,
  ): Promise<ValidationResult> {
    const provider = this.providers.get(config.type);
    if (!provider) {
      return {
        valid: false,
        errors: [`No provider registered for integration type: ${config.type}`],
      };
    }

    const validation = await provider.validateConfig(config.config);
    if (!validation.valid) {
      return validation;
    }

    const now = new Date();
    const integration: IntegrationConfig = {
      ...config,
      createdAt: now,
      updatedAt: now,
    };

    this.integrations.set(config.id, integration);
    return { valid: true };
  }

  getIntegration(id: string): IntegrationConfig | undefined {
    return this.integrations.get(id);
  }

  updateIntegration(id: string, updates: Partial<IntegrationConfig>): boolean {
    const integration = this.integrations.get(id);
    if (!integration) {
      return false;
    }

    this.integrations.set(id, {
      ...integration,
      ...updates,
      updatedAt: new Date(),
    });
    return true;
  }

  deleteIntegration(id: string): boolean {
    const deleted = this.integrations.delete(id);
    if (deleted) {
      // Dispose instance if it exists
      const instance = this.instances.get(id);
      if (instance) {
        // eslint-disable-next-line promise/prefer-await-to-then
        instance.dispose().catch(console.error);
        this.instances.delete(id);
      }
    }
    return deleted;
  }

  listIntegrations(
    type?: IntegrationType,
    status?: IntegrationStatus,
  ): IntegrationConfig[] {
    let integrations = Array.from(this.integrations.values());

    if (type) {
      integrations = integrations.filter((index) => index.type === type);
    }

    if (status) {
      integrations = integrations.filter((index) => index.status === status);
    }

    return integrations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async initializeIntegration(id: string): Promise<IntegrationResult> {
    const integration = this.integrations.get(id);
    if (!integration) {
      return { success: false, error: `Integration not found: ${id}` };
    }

    const provider = this.providers.get(integration.type);
    if (!provider) {
      return {
        success: false,
        error: `No provider for type: ${integration.type}`,
      };
    }

    try {
      const instance = await provider.initialize(integration.config);
      this.instances.set(id, instance);

      // Update integration status
      integration.status = "active";
      integration.lastUsedAt = new Date();
      integration.updatedAt = new Date();

      return { success: true, data: instance };
    } catch (error) {
      integration.status = "error";
      integration.updatedAt = new Date();

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async executeIntegration(
    id: string,
    context: IntegrationContext,
  ): Promise<IntegrationResult> {
    const integration = this.integrations.get(id);
    if (!integration) {
      return { success: false, error: `Integration not found: ${id}` };
    }

    if (integration.status !== "active") {
      return {
        success: false,
        error: `Integration not active: ${integration.status}`,
      };
    }

    const provider = this.providers.get(integration.type);
    if (!provider) {
      return {
        success: false,
        error: `No provider for type: ${integration.type}`,
      };
    }

    try {
      const result = await provider.execute(context);

      // Update last used timestamp
      integration.lastUsedAt = new Date();
      integration.updatedAt = new Date();

      return result;
    } catch (error) {
      integration.status = "error";
      integration.updatedAt = new Date();

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async disposeIntegration(id: string): Promise<boolean> {
    const instance = this.instances.get(id);
    if (!instance) {
      return false;
    }

    try {
      await instance.dispose();
      this.instances.delete(id);

      const integration = this.integrations.get(id);
      if (integration) {
        integration.status = "inactive";
        integration.updatedAt = new Date();
      }

      return true;
    } catch (error) {
      console.error(`Error disposing integration ${id}:`, error);
      return false;
    }
  }

  getIntegrationStats(): IntegrationStats {
    const integrations = Array.from(this.integrations.values());
    const instances = Array.from(this.instances.values());

    const stats: IntegrationStats = {
      total: integrations.length,
      byType: {
        webhook: 0,
        api: 0,
        plugin: 0,
        extension: 0,
        cli: 0,
        ui: 0,
      },
      byStatus: {
        pending: 0,
        active: 0,
        inactive: 0,
        error: 0,
      },
      activeInstances: instances.length,
    };

    for (const integration of integrations) {
      stats.byType[integration.type] =
        (stats.byType[integration.type] || 0) + 1;
      stats.byStatus[integration.status] =
        (stats.byStatus[integration.status] || 0) + 1;
    }

    return stats;
  }
}

export type IntegrationStats = {
  total: number;
  byType: Record<IntegrationType, number>;
  byStatus: Record<IntegrationStatus, number>;
  activeInstances: number;
};

export class WebhookProvider implements IntegrationProvider {
  readonly type: IntegrationType = "webhook";

  async validateConfig(
    config: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const urlValue = config["url"];
    if (!urlValue || typeof urlValue !== "string") {
      errors.push("url is required and must be a string");
    } else {
      try {
        new URL(urlValue);
      } catch {
        errors.push("url must be a valid URL");
      }
    }

    const methodValue = config["method"];
    if (
      !methodValue ||
      !["GET", "POST", "PUT", "DELETE"].includes(methodValue as string)
    ) {
      errors.push("method must be one of: GET, POST, PUT, DELETE");
    }

    const eventsValue = config["events"];
    if (
      !eventsValue ||
      !Array.isArray(eventsValue) ||
      eventsValue.length === 0
    ) {
      errors.push("events must be a non-empty array");
    }

    const secretValue = config["secret"];
    if (secretValue && typeof secretValue !== "string") {
      warnings.push("secret should be a string");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async initialize(
    config: Record<string, unknown>,
  ): Promise<IntegrationInstance> {
    return {
      id: `webhook-${Date.now()}`,
      config,
      state: {},
      dispose: async () => {
        // Cleanup webhook subscriptions
      },
    };
  }

  async execute(context: IntegrationContext): Promise<IntegrationResult> {
    const config = context.payload as WebhookIntegration["config"];
    if (!config) {
      return { success: false, error: "Missing webhook configuration" };
    }

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body: JSON.stringify(context.payload),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class ApiProvider implements IntegrationProvider {
  readonly type: IntegrationType = "api";

  async validateConfig(
    config: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    const baseUrlValue = config["baseUrl"];
    if (!baseUrlValue || typeof baseUrlValue !== "string") {
      errors.push("baseUrl is required and must be a string");
    }

    const endpointsValue = config["endpoints"];
    if (!endpointsValue || !Array.isArray(endpointsValue)) {
      errors.push("endpoints must be an array");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async initialize(
    config: Record<string, unknown>,
  ): Promise<IntegrationInstance> {
    return {
      id: `api-${Date.now()}`,
      config,
      state: {},
      dispose: async () => {
        // Cleanup API connections
      },
    };
  }

  async execute(_context: IntegrationContext): Promise<IntegrationResult> {
    // API integrations are typically called directly, not through events
    return {
      success: false,
      error: "API integrations should be called directly",
    };
  }
}
