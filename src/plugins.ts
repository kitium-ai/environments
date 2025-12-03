import { PluginHook } from './types';

export class PluginRegistry {
  private readonly hooks: Record<string, PluginHook[]> = {};

  register(event: string, hook: PluginHook): void {
    if (!this.hooks[event]) {
      this.hooks[event] = [];
    }
    this.hooks[event].push(hook);
  }

  async run(event: string, context: Record<string, unknown>): Promise<void> {
    const hooks = this.hooks[event] ?? [];
    for (const hook of hooks) {
      await hook(context);
    }
  }
}
