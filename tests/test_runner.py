from pathlib import Path

from codegeni.config import Config
from codegeni.runner import run_scan


def test_run_scan_empty_repo(tmp_path: Path):
    (tmp_path / "dummy.py").write_text("def foo():\n    return 1\n")
    cfg = Config(enable=True, analyzers=["python-ast"], exclude=[".git", ".venv"])  # minimal
    diags = run_scan(tmp_path, cfg)
    assert isinstance(diags, list)
