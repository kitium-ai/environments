"""Lightweight YAML helpers with a JSON fallback when PyYAML is unavailable."""

import importlib.util
import json
from typing import Any

_PYYAML_AVAILABLE = importlib.util.find_spec("yaml") is not None

if _PYYAML_AVAILABLE:
    import yaml as _yaml


def safe_load(text: str) -> Any:
    if _PYYAML_AVAILABLE:
        return _yaml.safe_load(text)
    return json.loads(text)


def safe_dump(payload: Any, sort_keys: bool = False) -> str:
    if _PYYAML_AVAILABLE:
        return _yaml.safe_dump(payload, sort_keys=sort_keys)
    return json.dumps(payload, indent=2)
