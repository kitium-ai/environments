import { getEnvkitLogger } from "../../logger.js";
import type { EnvironmentSpec } from "../../types.js";

/**
 * Plugin lifecycle event hooks
 */
export type PluginHooks = {
  "before:provision"?: (spec: EnvironmentSpec) => Promise<void>;
  "after:provision"?: (spec: EnvironmentSpec, result: unknown) => Promise<void>;
  "before:snapshot"?: (spec: EnvironmentSpec) => Promise<void>;
  "after:snapshot"?: (
    spec: EnvironmentSpec,
    snapshot: unknown,
  ) => Promise<void>;
  "before:doctor"?: (spec: EnvironmentSpec) => Promise<void>;
  "after:doctor"?: (spec: EnvironmentSpec, report: unknown) => Promise<void>;
  "before:destroy"?: (spec: EnvironmentSpec) => Promise<void>;
  "after:destroy"?: (spec: EnvironmentSpec, result: unknown) => Promise<void>;
};

/**
 * Plugin interface with lifecycle hooks
 */
export type Plugin = {
  readonly name: string;
  readonly version?: string;
  readonly hooks?: Partial<PluginHooks>;
};

/**
 * Plugin Manager with lifecycle hook support
 * Enables plugins to hook into key operations
 */
export class PluginManager {
  private readonly plugins: Map<string, Plugin> = new Map();
  private readonly logger = getEnvkitLogger({ component: "plugin-manager" });

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn("Plugin already registered", { plugin: plugin.name });
      return;
    }
    this.plugins.set(plugin.name, plugin);
    this.logger.info("Plugin registered", {
      plugin: plugin.name,
      version: plugin.version,
      hooks: plugin.hooks ? Object.keys(plugin.hooks).length : 0,
    });
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): void {
    this.plugins.delete(name);
    this.logger.info("Plugin unregistered", { plugin: name });
  }

  /**
   * Get a plugin
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute hook for all plugins
   */
  async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<void> {
    const errors: Array<{ plugin: string; error: Error }> = [];

    for (const plugin of this.plugins.values()) {
      const hook = plugin.hooks?.[hookName];
      if (!hook) {
        continue;
      }

      try {
        this.logger.debug("Executing plugin hook", {
          plugin: plugin.name,
          hook: hookName,
        });
        await (
          hook as (
            ...hookArguments: Parameters<NonNullable<PluginHooks[K]>>
          ) => Promise<void>
        )(...args);
      } catch (error) {
        const error_ =
          error instanceof Error ? error : new Error(String(error));
        this.logger.error("Plugin hook failed", error_, {
          plugin: plugin.name,
          hook: hookName,
        });
        errors.push({ plugin: plugin.name, error: error_ });
      }
    }

    if (errors.length > 0) {
      const errorMessages = errors
        .map(
          (errorEntry) => `${errorEntry.plugin}: ${errorEntry.error.message}`,
        )
        .join("; ");
      throw new Error(`Plugin hooks failed: ${errorMessages}`);
    }
  }

  /**
   * Execute pre-operation hook
   */
  async executeBeforeHook(
    hookName: Extract<keyof PluginHooks, `before:${string}`>,
    spec: EnvironmentSpec,
  ): Promise<void> {
    await this.executeHook(hookName, spec);
  }

  /**
   * Execute post-operation hook
   */
  async executeAfterHook(
    hookName: Extract<keyof PluginHooks, `after:${string}`>,
    spec: EnvironmentSpec,
    result: unknown,
  ): Promise<void> {
    await this.executeHook(hookName, spec, result);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    this.logger.info("All plugins cleared");
  }
}

/**
 * Global plugin manager singleton
 */
let globalPluginManager: PluginManager | undefined;

/**
 * Get the global plugin manager
 */
export function getPluginManager(): PluginManager {
  globalPluginManager ??= new PluginManager();
  return globalPluginManager;
}
