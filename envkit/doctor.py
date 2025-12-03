"""Health checks for environment readiness."""

import subprocess
from dataclasses import dataclass
from typing import Dict, List

from .constants import DEFAULT_STATE_DIR, HEALTH_CHECKS
from .logger import log_event


@dataclass
class CheckResult:
    name: str
    passed: bool
    output: str


@dataclass
class DoctorReport:
    results: List[CheckResult]

    @property
    def passed(self) -> bool:
        return all(result.passed for result in self.results)

    def as_dict(self) -> Dict[str, str]:
        return {result.name: result.output for result in self.results}


def run_check(name: str, command: str) -> CheckResult:
    try:
        completed = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        output = completed.stdout.strip() or completed.stderr.strip()
        log_event("health_check_pass", name=name, command=command, output=output)
        return CheckResult(name=name, passed=True, output=output)
    except subprocess.CalledProcessError as exc:
        output = exc.stdout.strip() or exc.stderr.strip()
        log_event("health_check_fail", name=name, command=command, output=output)
        return CheckResult(name=name, passed=False, output=output)


def run_doctor(additional_checks: List[str]) -> DoctorReport:
    results: List[CheckResult] = []
    DEFAULT_STATE_DIR.mkdir(parents=True, exist_ok=True)
    for name, command in HEALTH_CHECKS.items():
        results.append(run_check(name, command))
    for idx, command in enumerate(additional_checks):
        check_name = f"custom-{idx+1}"
        results.append(run_check(check_name, command))
    return DoctorReport(results=results)
