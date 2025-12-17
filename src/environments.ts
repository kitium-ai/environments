/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import type { EnvironmentHierarchy, EnvironmentSpec } from "./types.js";

export class EnvironmentResolver {
  private readonly environments: Map<string, EnvironmentSpec> = new Map();

  constructor(
    baseSpec: EnvironmentSpec,
    hierarchies: EnvironmentHierarchy[] = [],
  ) {
    this.buildEnvironmentHierarchy(baseSpec, hierarchies);
  }

  private buildEnvironmentHierarchy(
    baseSpec: EnvironmentSpec,
    hierarchies: EnvironmentHierarchy[],
  ): void {
    // Store base environment
    this.environments.set(baseSpec.name, baseSpec);

    // Build hierarchical environments
    for (const hierarchy of hierarchies) {
      const resolvedSpec = this.resolveHierarchy(baseSpec, hierarchy);
      this.environments.set(hierarchy.name, resolvedSpec);
    }
  }

  private resolveHierarchy(
    baseSpec: EnvironmentSpec,
    hierarchy: EnvironmentHierarchy,
  ): EnvironmentSpec {
    const parentSpec = this.getHierarchyParentSpec(baseSpec, hierarchy);
    return this.mergeHierarchySpec(parentSpec, hierarchy);
  }

  private getHierarchyParentSpec(
    baseSpec: EnvironmentSpec,
    hierarchy: EnvironmentHierarchy,
  ): EnvironmentSpec {
    if (!hierarchy.extends) {
      return baseSpec;
    }

    return this.environments.get(hierarchy.extends) ?? baseSpec;
  }

  private mergeHierarchySpec(
    parentSpec: EnvironmentSpec,
    hierarchy: EnvironmentHierarchy,
  ): EnvironmentSpec {
    const resolved: EnvironmentSpec = {
      ...parentSpec,
      name: hierarchy.name,
    };

    const overrides = hierarchy.overrides;
    if (!overrides) {
      return resolved;
    }

    if (overrides.description !== undefined) {
      resolved.description = overrides.description;
    }
    if (overrides.secrets !== undefined) {
      resolved.secrets = overrides.secrets;
    }
    if (overrides.toolchains !== undefined) {
      resolved.toolchains = overrides.toolchains;
    }
    if (overrides.policies !== undefined) {
      resolved.policies = overrides.policies;
    }
    if (overrides.checks !== undefined) {
      resolved.checks = overrides.checks;
    }

    return resolved;
  }

  getEnvironment(name: string): EnvironmentSpec | undefined {
    return this.environments.get(name);
  }

  listEnvironments(): string[] {
    return Array.from(this.environments.keys());
  }

  getAllEnvironments(): EnvironmentSpec[] {
    return Array.from(this.environments.values());
  }

  validateHierarchy(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [name, spec] of this.environments) {
      // Check for circular dependencies
      const visited = new Set<string>();
      let current: EnvironmentSpec | undefined = spec;

      while (current) {
        if (visited.has(current.name)) {
          errors.push(`Circular dependency detected in environment: ${name}`);
          break;
        }
        visited.add(current.name);

        // Find parent environment
        const hierarchy = spec.environments?.find(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          (h) => h.name === current!.name,
        );
        if (hierarchy?.extends) {
          current = this.environments.get(hierarchy.extends);
        } else {
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export class EnvironmentManager {
  private readonly resolver: EnvironmentResolver;

  constructor(baseSpec: EnvironmentSpec) {
    this.resolver = new EnvironmentResolver(baseSpec, baseSpec.environments);
  }

  getEnvironment(name: string): EnvironmentSpec | undefined {
    return this.resolver.getEnvironment(name);
  }

  listEnvironments(): string[] {
    return this.resolver.listEnvironments();
  }

  promoteEnvironment(from: string, to: string): EnvironmentSpec | null {
    const sourceEnvironment = this.getEnvironment(from);
    const targetEnvironment = this.getEnvironment(to);

    if (!sourceEnvironment || !targetEnvironment) {
      return null;
    }

    // Create promotion hierarchy
    const promotionHierarchy: EnvironmentHierarchy = {
      name: `${from}-to-${to}`,
      extends: to,
      overrides: {
        ...(sourceEnvironment.secrets !== undefined
          ? { secrets: sourceEnvironment.secrets }
          : {}),
        ...(sourceEnvironment.toolchains !== undefined
          ? { toolchains: sourceEnvironment.toolchains }
          : {}),
      },
    };

    // Resolve the promoted environment
    const resolver = new EnvironmentResolver(targetEnvironment, [
      promotionHierarchy,
    ]);
    return resolver.getEnvironment(promotionHierarchy.name) || null;
  }

  validateEnvironments(): { valid: boolean; errors: string[] } {
    return this.resolver.validateHierarchy();
  }
}
