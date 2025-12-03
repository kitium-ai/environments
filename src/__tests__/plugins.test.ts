import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from '../plugins.js';

describe('plugins', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('PluginRegistry', () => {
    it('should register a plugin hook', () => {
      const hook = async () => {
        /* no-op */
      };
      registry.register('test-event', hook);

      // No error means success
      expect(true).toBe(true);
    });

    it('should run registered hooks', async () => {
      let called = false;
      const hook = async () => {
        called = true;
      };

      registry.register('test-event', hook);
      await registry.run('test-event', {});

      expect(called).toBe(true);
    });

    it('should pass context to hooks', async () => {
      let receivedContext: Record<string, unknown> = {};
      const hook = async (context: Record<string, unknown>) => {
        receivedContext = context;
      };

      const context = { test: 'value', number: 123 };
      registry.register('test-event', hook);
      await registry.run('test-event', context);

      expect(receivedContext).toEqual(context);
    });

    it('should run multiple hooks for same event', async () => {
      const calls: number[] = [];

      registry.register('test-event', async () => {
        calls.push(1);
      });
      registry.register('test-event', async () => {
        calls.push(2);
      });
      registry.register('test-event', async () => {
        calls.push(3);
      });

      await registry.run('test-event', {});

      expect(calls).toEqual([1, 2, 3]);
    });

    it('should run hooks in order of registration', async () => {
      const order: string[] = [];

      registry.register('test-event', async () => {
        order.push('first');
      });
      registry.register('test-event', async () => {
        order.push('second');
      });

      await registry.run('test-event', {});

      expect(order).toEqual(['first', 'second']);
    });

    it('should handle synchronous hooks', async () => {
      let called = false;
      const hook = () => {
        called = true;
      };

      registry.register('test-event', hook);
      await registry.run('test-event', {});

      expect(called).toBe(true);
    });

    it('should handle events with no registered hooks', async () => {
      // Should not throw
      await expect(registry.run('non-existent-event', {})).resolves.toBeUndefined();
    });

    it('should support multiple different events', async () => {
      const event1Called: boolean[] = [];
      const event2Called: boolean[] = [];

      registry.register('event1', async () => {
        event1Called.push(true);
      });
      registry.register('event2', async () => {
        event2Called.push(true);
      });

      await registry.run('event1', {});
      await registry.run('event2', {});

      expect(event1Called).toHaveLength(1);
      expect(event2Called).toHaveLength(1);
    });

    it('should allow hooks to modify context', async () => {
      const context: Record<string, unknown> = { count: 0 };

      registry.register('test-event', async (ctx) => {
        ctx.count = (ctx.count as number) + 1;
      });
      registry.register('test-event', async (ctx) => {
        ctx.count = (ctx.count as number) + 1;
      });

      await registry.run('test-event', context);

      expect(context.count).toBe(2);
    });

    it('should handle async operations in hooks', async () => {
      const results: string[] = [];

      registry.register('test-event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push('async1');
      });
      registry.register('test-event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push('async2');
      });

      await registry.run('test-event', {});

      expect(results).toHaveLength(2);
      expect(results).toContain('async1');
      expect(results).toContain('async2');
    });
  });
});
