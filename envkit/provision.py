"""Provisioning and teardown utilities."""

import json
import shutil
from pathlib import Path
from typing import Dict, Iterable, List

from .config import EnvironmentSpec
from .constants import DEFAULT_CACHE_DIR, DEFAULT_STATE_DIR
from .logger import log_event, log_console


def _ensure_state() -> None:
    DEFAULT_STATE_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def cache_toolchains(toolchains: Iterable[Dict[str, str]]) -> Path:
    _ensure_state()
    cache_file = DEFAULT_CACHE_DIR / "toolchains.json"
    cache_file.write_text(json.dumps(list(toolchains), indent=2), encoding="utf-8")
    log_event("cache_toolchains", path=str(cache_file))
    return cache_file


def apply_policies(policies: List[str]) -> List[str]:
    rendered: List[str] = []
    for policy in policies:
        path = Path(policy)
        if not path.exists():
            log_event("policy_missing", policy=policy)
            rendered.append(f"missing:{policy}")
            continue
        rendered.append(path.read_text(encoding="utf-8"))
    log_event("policies_loaded", count=len(rendered))
    return rendered


def provision_environment(spec: EnvironmentSpec) -> Path:
    _ensure_state()
    cache_toolchains([tool.as_dict() for tool in spec.toolchains])
    apply_policies(spec.policies)
    summary = DEFAULT_STATE_DIR / "last_provision.json"
    summary.write_text(json.dumps(spec.as_dict(), indent=2), encoding="utf-8")
    log_console(f"Provisioned environment '{spec.name}' with {len(spec.toolchains)} toolchains")
    return summary


def destroy_environment(preserve_cache: bool = False) -> None:
    if DEFAULT_STATE_DIR.exists():
        if preserve_cache and DEFAULT_CACHE_DIR.exists():
            cache_snapshot = DEFAULT_STATE_DIR / "cache_backup.json"
            cache_snapshot.write_text(DEFAULT_CACHE_DIR.read_text(encoding="utf-8") if DEFAULT_CACHE_DIR.is_file() else "{}", encoding="utf-8")
        shutil.rmtree(DEFAULT_STATE_DIR)
        log_console("Environment state removed")
    else:
        log_console("No environment state found to destroy")


def run_snapshot(spec: EnvironmentSpec, lock_path: Path) -> Path:
    _ensure_state()
    snapshot = {
        "fingerprint": spec.fingerprint(),
        "toolchains": [tool.as_dict() for tool in spec.toolchains],
        "policies": spec.policies,
    }
    lock_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    (DEFAULT_STATE_DIR / "snapshots" / f"{spec.name}.json").write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    log_event("snapshot_created", path=str(lock_path))
    return lock_path
