"""Environment specification parsing and validation."""

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from .constants import DEFAULT_SPEC_PATH, SUPPORTED_SECRET_PROVIDERS
from .yaml_support import safe_dump, safe_load


@dataclass
class SecretConfig:
    provider: str
    path: str
    rotation_days: Optional[int] = None

    def validate(self) -> None:
        if self.provider not in SUPPORTED_SECRET_PROVIDERS:
            raise ValueError(f"Unsupported secret provider: {self.provider}")
        if not self.path:
            raise ValueError("Secret path must be provided")
        if self.rotation_days is not None and self.rotation_days <= 0:
            raise ValueError("rotation_days must be positive when provided")


@dataclass
class Toolchain:
    name: str
    version: str
    source: Optional[str] = None

    def as_dict(self) -> Dict[str, str]:
        return {"name": self.name, "version": self.version, "source": self.source or ""}


@dataclass
class EnvironmentSpec:
    name: str
    description: str
    secrets: List[SecretConfig] = field(default_factory=list)
    toolchains: List[Toolchain] = field(default_factory=list)
    policies: List[str] = field(default_factory=list)
    checks: List[str] = field(default_factory=list)

    def validate(self) -> None:
        if not self.name:
            raise ValueError("Environment name is required")
        for secret in self.secrets:
            secret.validate()
        for policy in self.policies:
            if not policy.strip():
                raise ValueError("Policy references cannot be empty")

    def fingerprint(self) -> str:
        digest = hashlib.sha256()
        digest.update(json.dumps(self.as_dict(), sort_keys=True).encode("utf-8"))
        return digest.hexdigest()

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "secrets": [secret.__dict__ for secret in self.secrets],
            "toolchains": [tool.as_dict() for tool in self.toolchains],
            "policies": self.policies,
            "checks": self.checks,
        }


@dataclass
class ConfigResult:
    spec: EnvironmentSpec
    path: Path


SAMPLE_SPEC = {
    "name": "sample-python-service",
    "description": "Local + CI environment with reproducible toolchains and secrets",
    "secrets": [
        {"provider": "vault", "path": "kv/services/sample-python-service", "rotation_days": 30}
    ],
    "toolchains": [
        {"name": "python", "version": "3.11"},
        {"name": "node", "version": "20"},
    ],
    "policies": ["policies/baseline.rego"],
    "checks": ["python --version", "node --version"],
}


def load_spec(path: Path = DEFAULT_SPEC_PATH) -> ConfigResult:
    data = safe_load(path.read_text(encoding="utf-8"))
    secrets = [SecretConfig(**item) for item in data.get("secrets", [])]
    toolchains = [Toolchain(**item) for item in data.get("toolchains", [])]
    spec = EnvironmentSpec(
        name=data.get("name", ""),
        description=data.get("description", ""),
        secrets=secrets,
        toolchains=toolchains,
        policies=data.get("policies", []),
        checks=data.get("checks", []),
    )
    spec.validate()
    return ConfigResult(spec=spec, path=path)


def write_sample_spec(path: Path = DEFAULT_SPEC_PATH) -> Path:
    path.write_text(safe_dump(SAMPLE_SPEC, sort_keys=False), encoding="utf-8")
    return path
