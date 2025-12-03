"""Lightweight plugin registry to extend envkit commands."""

from typing import Callable, Dict, List

from .logger import log_event

Plugin = Callable[[], None]


class PluginRegistry:
    def __init__(self) -> None:
        self._registry: Dict[str, Plugin] = {}

    def register(self, name: str, plugin: Plugin) -> None:
        if name in self._registry:
            raise ValueError(f"Plugin already registered: {name}")
        self._registry[name] = plugin
        log_event("plugin_registered", name=name)

    def run_all(self) -> None:
        for name, plugin in self._registry.items():
            log_event("plugin_start", name=name)
            plugin()
            log_event("plugin_complete", name=name)

    @property
    def names(self) -> List[str]:
        return list(self._registry.keys())


def default_registry() -> PluginRegistry:
    return PluginRegistry()
