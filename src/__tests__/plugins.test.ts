import { sleep } from '@kitiumai/utils-ts';
import { beforeEach, describe, expect, it } from 'vitest';

import { PluginRegistry } from '../plugins.js';

describe('plugins', () => {
  const TEST_EVENT = 'test-event';
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
  });

  describe('PluginRegistry', () => {
    it('should register a plugin hook', () => {
      const hook = (): void => {
        // no-op
      };
      registry.register(TEST_EVENT, hook);

      // No error means success
      expect(true).toBe(true);
    });

    it('should run registered hooks', async () => {
      let isCalled = false;
      const hook = (): void => {
        isCalled = true;
      };

      registry.register(TEST_EVENT, hook);
      await registry.run(TEST_EVENT, {});

      expect(isCalled).toBe(true);
    });

    it('should pass context to hooks', async () => {
      let receivedContext: Record<string, unknown> = {};
      const hook = (hookContext: Record<string, unknown>): void => {
        receivedContext = hookContext;
      };

      const context = { test: 'value', number: 123 };
      registry.register(TEST_EVENT, hook);
      await registry.run(TEST_EVENT, context);

      expect(receivedContext).toEqual(context);
    });

    it('should run multiple hooks for same event', async () => {
      const calls: number[] = [];

      registry.register(TEST_EVENT, () => {
        calls.push(1);
      });
      registry.register(TEST_EVENT, () => {
        calls.push(2);
      });
      registry.register(TEST_EVENT, () => {
        calls.push(3);
      });

      await registry.run(TEST_EVENT, {});

      expect(calls).toEqual([1, 2, 3]);
    });

    it('should run hooks in order of registration', async () => {
      const order: string[] = [];

      registry.register(TEST_EVENT, () => {
        order.push('first');
      });
      registry.register(TEST_EVENT, () => {
        order.push('second');
      });

      await registry.run(TEST_EVENT, {});

      expect(order).toEqual(['first', 'second']);
    });

    it('should handle synchronous hooks', async () => {
      let isCalled = false;
      const hook = () => {
        isCalled = true;
      };

      registry.register(TEST_EVENT, hook);
      await registry.run(TEST_EVENT, {});

      expect(isCalled).toBe(true);
    });

    it('should handle events with no registered hooks', async () => {
      // Should not throw
      await expect(registry.run('non-existent-event', {})).resolves.toBeUndefined();
    });

    it('should support multiple different events', async () => {
      const event1Called: boolean[] = [];
      const event2Called: boolean[] = [];

      registry.register('event1', () => {
        event1Called.push(true);
      });
      registry.register('event2', () => {
        event2Called.push(true);
      });

      await registry.run('event1', {});
      await registry.run('event2', {});

      expect(event1Called).toHaveLength(1);
      expect(event2Called).toHaveLength(1);
    });

    it('should allow hooks to modify context', async () => {
      const context: Record<string, unknown> = { count: 0 };

      registry.register(TEST_EVENT, (hookContext) => {
        hookContext['count'] = ((hookContext['count'] as number) ?? 0) + 1;
      });
      registry.register(TEST_EVENT, (hookContext) => {
        hookContext['count'] = ((hookContext['count'] as number) ?? 0) + 1;
      });

      await registry.run(TEST_EVENT, context);

      expect(context['count']).toBe(2);
    });

    it('should handle async operations in hooks', async () => {
      const results: string[] = [];

      registry.register(TEST_EVENT, async () => {
        await sleep(10);
        results.push('async1');
      });
      registry.register(TEST_EVENT, async () => {
        await sleep(5);
        results.push('async2');
      });

      await registry.run(TEST_EVENT, {});

      expect(results).toHaveLength(2);
      expect(results).toContain('async1');
      expect(results).toContain('async2');
    });
  });
});
