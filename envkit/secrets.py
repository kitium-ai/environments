"""Secrets abstraction with policy hooks."""

from dataclasses import dataclass
from typing import Dict, List

from .config import SecretConfig
from .logger import log_event


@dataclass
class SecretValue:
    path: str
    provider: str
    value: str


class SecretsBroker:
    def __init__(self, secrets: List[SecretConfig]):
        self.secrets = secrets

    def fetch(self) -> Dict[str, SecretValue]:
        resolved: Dict[str, SecretValue] = {}
        for secret in self.secrets:
            synthetic_value = f"placeholder-for-{secret.path}"
            resolved[secret.path] = SecretValue(path=secret.path, provider=secret.provider, value=synthetic_value)
            log_event("secret_fetched", provider=secret.provider, path=secret.path)
        return resolved

    def rotate(self) -> None:
        for secret in self.secrets:
            log_event("secret_rotation", provider=secret.provider, path=secret.path)
