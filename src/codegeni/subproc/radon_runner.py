from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import List

from ..config import Config
from ..models import Diagnostic, DiagnosticSeverity
from ..analyzers.base import Analyzer


class RadonAnalyzer(Analyzer):
    name = "radon"

    def run(self, root: Path, config: Config) -> List[Diagnostic]:
        if not shutil.which("radon"):
            return []
        # Use radon cc (cyclomatic complexity) JSON
        cmd = ["radon", "cc", "-s", "-j", str(root)]
        try:
            proc = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True, check=False)
        except Exception:
            return []
        if proc.returncode != 0:
            return []
        diags: List[Diagnostic] = []
        try:
            data = json.loads(proc.stdout or "{}")
        except json.JSONDecodeError:
            data = {}
        for file_path, entries in data.items():
            for entry in entries:
                complexity = entry.get("complexity", 0)
                rank = entry.get("rank", "-")
                msg = f"Cyclomatic complexity {complexity} (rank {rank}) for {entry.get('name', '')}"
                diags.append(
                    Diagnostic(
                        ruleId="RADON-CC",
                        message=msg,
                        severity=DiagnosticSeverity.info,
                        path=file_path,
                        line=int(entry.get("lineno", 1)),
                        col=0,
                        source=self.name,
                    )
                )
        return diags
