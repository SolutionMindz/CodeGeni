from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import click

from .config import load_config
from .runner import run_scan
from .models import Diagnostic


@click.group()
def main() -> None:
    """CodeGeni CLI - unified code quality diagnostics."""


@main.command()
@click.argument("path", type=click.Path(exists=True, path_type=Path), default=Path("."))
@click.option("--format", "fmt", type=click.Choice(["json", "ndjson", "text"], case_sensitive=False), default="json")
@click.option("--config", "config_file", type=click.Path(exists=True, path_type=Path), required=False)
@click.option("--no-color", is_flag=True, default=False, help="Disable colors for text output")
def scan(path: Path, fmt: str, config_file: Optional[Path], no_color: bool) -> None:
    """Scan a PATH and output diagnostics."""
    cfg = load_config(path, config_file)
    diags = run_scan(path, cfg)

    if fmt == "json":
        print(json.dumps([d.model_dump() for d in diags], indent=2))
    elif fmt == "ndjson":
        for d in diags:
            print(json.dumps(d.model_dump()))
    else:
        # simple text
        for d in diags:
            loc = f"{d.path}:{d.line}:{d.col}"
            print(f"[{d.severity.upper()}] {loc} {d.ruleId} - {d.message}")


@main.command()
@click.option("--host", default="127.0.0.1", show_default=True)
@click.option("--port", default=8899, show_default=True)
def serve(host: str, port: int) -> None:
    """Start a local API server (requires optional server dependencies)."""
    try:
        import uvicorn  # type: ignore
        from .server import create_app
    except Exception as e:
        raise click.ClickException(
            "Server dependencies not installed. Install with 'pip install .[server,analyzers]'"
        ) from e

    app = create_app()
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
