# Environment Package

This repository now ships an enterprise-ready toolkit ("envkit") for environment setup, reproducibility, and governance with simplified APIs and batteries-included defaults.

## Features
- **Unified CLI**: `envkit` commands for `init`, `doctor`, `provision`, `snapshot`, and `destroy` mirror the ergonomics of cloud CLIs.
- **Declarative specs**: A single `envkit.yaml` drives provisioning, health checks, policy hooks, and toolchain caching.
- **Security guardrails**: Built-in secret broker abstraction, policy references, and structured audit logging for every action.
- **Reliability**: Deterministic snapshots (`envkit.lock.json`), environment diagnostics, and cached toolchains with provenance fingerprinting.
- **Extensibility**: Plugin registry to add organization-specific logic and reusable policies.

## Quick Start
```bash
python -m envkit.cli init              # Scaffold envkit.yaml and state directories
python -m envkit.cli doctor            # Run baseline + custom health checks
python -m envkit.cli provision         # Cache toolchains, apply policies, and fetch secrets
python -m envkit.cli snapshot          # Produce envkit.lock.json for reproducible builds
python -m envkit.cli destroy           # Remove envkit state (pass --preserve-cache to keep toolchains)
```

## Example Spec (`envkit.yaml`)
```yaml
name: sample-python-service
description: Local + CI environment with reproducible toolchains and secrets
secrets:
  - provider: vault
    path: kv/services/sample-python-service
    rotation_days: 30
toolchains:
  - name: python
    version: "3.11"
  - name: node
    version: "20"
policies:
  - policies/baseline.rego
checks:
  - python --version
  - node --version
```

When PyYAML is not installed, use the JSON-equivalent spec:

```json
{
  "name": "sample-python-service",
  "description": "Local + CI environment with reproducible toolchains and secrets",
  "secrets": [
    {"provider": "vault", "path": "kv/services/sample-python-service", "rotation_days": 30}
  ],
  "toolchains": [
    {"name": "python", "version": "3.11"},
    {"name": "node", "version": "20"}
  ],
  "policies": ["policies/baseline.rego"],
  "checks": ["python --version", "node --version"]
}
```

## API References
- **Environment parsing**: `envkit.config.load_spec` reads and validates `envkit.yaml`, returning a strongly-typed `EnvironmentSpec` with fingerprinting support.
- **Health diagnostics**: `envkit.doctor.run_doctor` executes baseline and custom checks, persisting structured results to `.envkit/diagnostics/doctor.json`.
- **Provisioning**: `envkit.provision.provision_environment` caches toolchains, loads policies, and records last applied configuration.
- **Snapshots**: `envkit.provision.run_snapshot` creates deterministic lockfiles and stores historical snapshots.
- **Secrets**: `envkit.secrets.SecretsBroker` provides a single interface to fetch and rotate secrets across supported providers.
- **Plugins**: `envkit.plugins.PluginRegistry` enables registering and running organization-specific hooks.

## Development Notes
- State lives under `.envkit/` and is safe to commit to CI artifacts but should be excluded from source control if sensitive material is added.
- Policies are expected to be written in Rego (OPA). Place them under `policies/` and reference them in `envkit.yaml` to enforce guardrails during provisioning.
- Native YAML parsing uses PyYAML when available; if not installed, the CLI falls back to JSON-compatible specs while still emitting valid lockfiles.
