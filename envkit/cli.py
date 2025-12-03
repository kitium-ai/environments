"""Command-line interface for envkit."""

import argparse
import json
from pathlib import Path
from typing import List

from .config import ConfigResult, EnvironmentSpec, load_spec, write_sample_spec
from .constants import DEFAULT_LOCK_PATH, DEFAULT_SPEC_PATH
from .doctor import run_doctor
from .logger import initialize_state_dirs, log_console
from .plugins import default_registry
from .provision import destroy_environment, provision_environment, run_snapshot
from .secrets import SecretsBroker


def init_command(path: Path) -> None:
    created = write_sample_spec(path)
    initialize_state_dirs()
    log_console(f"Initialized environment spec at {created}")


def doctor_command(spec: EnvironmentSpec) -> None:
    report = run_doctor(spec.checks)
    status = "pass" if report.passed else "fail"
    diagnostics_path = Path(".envkit/diagnostics/doctor.json")
    diagnostics_path.write_text(json.dumps(report.as_dict(), indent=2), encoding="utf-8")
    log_console(f"Doctor status: {status}. Details saved to {diagnostics_path}")


def provision_command(spec: EnvironmentSpec) -> None:
    broker = SecretsBroker(spec.secrets)
    broker.fetch()
    provision_environment(spec)
    log_console("Provisioning completed.")


def snapshot_command(spec: EnvironmentSpec, lock_path: Path) -> None:
    run_snapshot(spec, lock_path)
    log_console(f"Snapshot written to {lock_path}")


def destroy_command(preserve_cache: bool) -> None:
    destroy_environment(preserve_cache=preserve_cache)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Enterprise environment toolkit")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Create a starter environment spec")
    init_parser.add_argument("--path", type=Path, default=DEFAULT_SPEC_PATH, help="Where to write the spec")

    doctor_parser = subparsers.add_parser("doctor", help="Run health checks")
    doctor_parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC_PATH, help="Spec file path")

    provision_parser = subparsers.add_parser("provision", help="Provision an environment from the spec")
    provision_parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC_PATH, help="Spec file path")

    snapshot_parser = subparsers.add_parser("snapshot", help="Create a deterministic lockfile")
    snapshot_parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC_PATH, help="Spec file path")
    snapshot_parser.add_argument("--lock", type=Path, default=DEFAULT_LOCK_PATH, help="Lockfile path")

    destroy_parser = subparsers.add_parser("destroy", help="Remove envkit state")
    destroy_parser.add_argument("--preserve-cache", action="store_true", help="Keep cached toolchains")

    plugins_parser = subparsers.add_parser("plugins", help="List registered plugins")
    return parser


def dispatch(args: argparse.Namespace) -> None:
    if args.command == "init":
        init_command(args.path)
        return

    if args.command == "destroy":
        destroy_command(args.preserve_cache)
        return

    if args.command == "plugins":
        registry = default_registry()
        log_console("Registered plugins: " + ", ".join(registry.names) if registry.names else "No plugins registered")
        return

    config = load_spec(args.spec)
    spec = config.spec

    if args.command == "doctor":
        doctor_command(spec)
    elif args.command == "provision":
        provision_command(spec)
    elif args.command == "snapshot":
        snapshot_command(spec, args.lock)


def main(argv: List[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    dispatch(args)


if __name__ == "__main__":
    main()
