# Envkit (TypeScript)

Envkit is an enterprise-ready TypeScript toolkit for provisioning reproducible environments with policy and security guardrails. It ships a CLI plus programmatic APIs for diagnostics, provisioning, snapshotting, and secrets brokering.

## Features
- **Unified CLI**: `envkit` commands for `init`, `doctor`, `provision`, `snapshot`, `destroy`, `secrets`, and plugin discovery.
- **Declarative specs**: YAML-based `envkit.yaml` drives provisioning, health checks, policy hooks, and toolchain caching.
- **Security guardrails**: Secrets broker abstraction, policy references, and structured audit logging for every action.
- **Reliability**: Deterministic snapshots (`.envkit/envkit.lock.json`), environment diagnostics, and cached toolchains with provenance fingerprinting.
- **Extensibility**: Plugin registry to add organization-specific logic and reusable policies.

## Quick Start (CLI)
```bash
npm install --global envkit
envkit init                         # Scaffold envkit.yaml and state directories
envkit doctor                       # Run baseline + custom health checks
envkit provision                    # Apply toolchains, policies, and fetch secrets
envkit snapshot                     # Produce .envkit/envkit.lock.json for reproducibility
envkit destroy --preserve-logs      # Remove envkit state (keeping logs when desired)
```

## Programmatic Usage (TypeScript)
```ts
import { loadSpec, runDoctor, createSnapshot, provisionEnvironment, SecretsBroker } from 'envkit';

async function bootstrap() {
  const spec = await loadSpec('envkit.yaml');
  await provisionEnvironment(spec);
  await runDoctor(spec);
  await createSnapshot(spec);

  const broker = new SecretsBroker(spec);
  const secrets = await broker.fetchAll();
  console.log(secrets);
}

bootstrap();
```

## Example Spec (`envkit.yaml`)
```yaml
name: sample-service
description: Local + CI environment with reproducible toolchains and secrets
secrets:
  - provider: vault
    path: kv/services/sample-service
    rotationDays: 30
toolchains:
  - name: node
    version: "20"
  - name: python
    version: "3.11"
policies:
  - policies/baseline.rego
checks:
  - node --version
  - npm --version
```

## API References
- **Environment parsing**: `loadSpec(path)` reads and validates `envkit.yaml`, returning a strongly-typed `EnvironmentSpec` with fingerprinting support.
- **Health diagnostics**: `runDoctor(spec)` executes baseline and custom checks, persisting structured results to `.envkit/diagnostics/doctor.json`.
- **Provisioning**: `provisionEnvironment(spec)` records toolchains, policies, and secrets with audit logging.
- **Snapshots**: `createSnapshot(spec)` creates deterministic lockfiles under `.envkit/envkit.lock.json`.
- **Secrets**: `SecretsBroker` fetches secrets through a unified interface across providers.
- **Plugins**: `PluginRegistry` enables registering and running organization-specific hooks.

## Development Notes
- State lives under `.envkit/` and can be committed to CI artifacts but should be excluded from source control if sensitive material is added.
- Policies are expected to be written in Rego (OPA). Reference them in `envkit.yaml` to enforce guardrails during provisioning.
- The package targets Node.js 18+ with TypeScript typings included. Build with `npm run build`.
