"""Structured logging helpers."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from .constants import DEFAULT_LOG_PATH, DEFAULT_STATE_DIR


def _ensure_log_directory(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def log_event(event: str, **metadata: Any) -> None:
    """Write a structured event to the activity log."""
    _ensure_log_directory(DEFAULT_LOG_PATH)
    entry: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "metadata": metadata,
    }
    DEFAULT_LOG_PATH.open("a", encoding="utf-8").write(json.dumps(entry) + "\n")


def log_console(message: str) -> None:
    """Write a message to stdout and log file."""
    _ensure_log_directory(DEFAULT_LOG_PATH)
    print(message)
    DEFAULT_LOG_PATH.open("a", encoding="utf-8").write(message + "\n")


def initialize_state_dirs() -> None:
    DEFAULT_STATE_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_LOG_PATH.touch(exist_ok=True)
    (DEFAULT_STATE_DIR / "diagnostics").mkdir(exist_ok=True)
    (DEFAULT_STATE_DIR / "snapshots").mkdir(exist_ok=True)
    (DEFAULT_STATE_DIR / "policies").mkdir(exist_ok=True)
