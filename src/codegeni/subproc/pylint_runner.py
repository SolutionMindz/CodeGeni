from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import List

from ..config import Config
from ..models import Diagnostic, DiagnosticSeverity
from ..analyzers.base import Analyzer


class PylintAnalyzer(Analyzer):
    name = "pylint"

    def run(self, root: Path, config: Config) -> List[Diagnostic]:
        if not shutil.which("pylint"):
            return []
        cmd = ["pylint", str(root), "-f", "json"]
        try:
            proc = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True, check=False)
        except Exception:
            return []
        if proc.returncode not in (0, 2, 4, 8, 16, 32):
            return []
        diags: List[Diagnostic] = []
        try:
            items = json.loads(proc.stdout or "[]")
        except json.JSONDecodeError:
            items = []
        for it in items:
            diags.append(
                Diagnostic(
                    ruleId=it.get("symbol") or it.get("message-id", "pylint"),
                    message=it.get("message", ""),
                    severity=DiagnosticSeverity.warning,
                    path=it.get("path", ""),
                    line=int(it.get("line", 1)),
                    col=int(it.get("column", 0)),
                    source=self.name,
                )
            )
        return diags
