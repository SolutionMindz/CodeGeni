from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Optional

import tomllib
import yaml
from pydantic import BaseModel


class PythonConfig(BaseModel):
    max_function_lines: int = 60
    max_nesting_depth: int = 3


class Config(BaseModel):
    enable: bool = True
    analyzers: List[str] = [
        "flake8",
        "pylint",
        "bandit",
        "radon",
        "python-ast",
    ]
    severity_threshold: str = "info"
    exclude: List[str] = [".git", ".venv", "node_modules", "dist", "build"]
    python: PythonConfig = PythonConfig()


def _read_yaml_file(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _read_pyproject_codegeni(root: Path) -> dict:
    pyproject = root / "pyproject.toml"
    if not pyproject.exists():
        return {}
    with pyproject.open("rb") as f:
        data = tomllib.load(f)
    return data.get("tool", {}).get("codegeni", {})


def load_config(start_path: Path, explicit_config: Optional[Path] = None) -> Config:
    """Load configuration by precedence:
    1) explicit_config if provided
    2) .codegeni.yaml in root
    3) [tool.codegeni] from pyproject.toml
    """
    start_path = start_path.resolve()
    root = start_path if start_path.is_dir() else start_path.parent

    if explicit_config:
        data = _read_yaml_file(explicit_config)
        return Config.model_validate(data)

    yaml_path = root / ".codegeni.yaml"
    if yaml_path.exists():
        data = _read_yaml_file(yaml_path)
        return Config.model_validate(data)

    data = _read_pyproject_codegeni(root)
    return Config.model_validate(data) if data else Config()


def is_excluded(path: Path, config: Config) -> bool:
    parts = set(path.parts)
    return any(ex in parts for ex in config.exclude)
