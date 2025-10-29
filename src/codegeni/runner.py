from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, List, Optional

from .config import Config, load_config
from .models import Diagnostic
from .analyzers import Analyzer, PythonAstAnalyzer

# Optional analyzers via subprocess will be lazily loaded


def _load_subprocess_analyzer(name: str) -> Optional[Analyzer]:
    """Attempt to load a subprocess-based analyzer by name."""
    loader_map = {
        "flake8": ("subproc.flake8_runner", "Flake8Analyzer"),
        "pylint": ("subproc.pylint_runner", "PylintAnalyzer"),
        "bandit": ("subproc.bandit_runner", "BanditAnalyzer"),
        "radon": ("subproc.radon_runner", "RadonAnalyzer"),
    }
    
    if name not in loader_map:
        return None
    
    module_name, class_name = loader_map[name]
    try:
        module = __import__(f"codegeni.{module_name}", fromlist=[class_name])
        analyzer_class = getattr(module, class_name)
        return analyzer_class()
    except Exception:
        return None


def _resolver(names: Iterable[str]) -> List[Analyzer]:
    """Resolve analyzer names to Analyzer instances."""
    mapping: Dict[str, Analyzer] = {
        "python-ast": PythonAstAnalyzer(),
    }

    analyzers: List[Analyzer] = []
    for name in names:
        lower = name.lower()
        
        # Check built-in analyzers first
        if lower in mapping:
            analyzers.append(mapping[lower])
            continue
        
        # Try loading subprocess-based analyzer
        analyzer = _load_subprocess_analyzer(lower)
        if analyzer:
            analyzers.append(analyzer)
    
    return analyzers


def run_scan(path: Path, config: Config | None = None) -> List[Diagnostic]:
    root = path if path.is_dir() else path.parent
    cfg = config or load_config(root)
    if not cfg.enable:
        return []

    diags: List[Diagnostic] = []
    for analyzer in _resolver(cfg.analyzers):
        diags.extend(analyzer.run(root, cfg))
    return diags
