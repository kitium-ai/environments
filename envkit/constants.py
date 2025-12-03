"""Shared constants for envkit."""

from pathlib import Path

DEFAULT_SPEC_PATH = Path("envkit.yaml")
DEFAULT_LOCK_PATH = Path("envkit.lock.json")
DEFAULT_STATE_DIR = Path(".envkit")
DEFAULT_CACHE_DIR = DEFAULT_STATE_DIR / "cache"
DEFAULT_LOG_PATH = DEFAULT_STATE_DIR / "activity.log"
SUPPORTED_SECRET_PROVIDERS = {"vault", "aws-secrets-manager", "azure-key-vault", "gcp-secret-manager"}

HEALTH_CHECKS = {
    "python": "python --version",
    "git": "git --version",
}
