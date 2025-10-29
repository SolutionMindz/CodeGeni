from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import List

from ..config import Config
from ..models import Diagnostic, DiagnosticSeverity
from ..analyzers.base import Analyzer


class BanditAnalyzer(Analyzer):
    name = "bandit"

    def run(self, root: Path, config: Config) -> List[Diagnostic]:
        if not shutil.which("bandit"):
            return []
        cmd = ["bandit", "-r", str(root), "-f", "json"]
        try:
            proc = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True, check=False)
        except Exception:
            return []
        if proc.returncode not in (0, 1):
            return []
        diags: List[Diagnostic] = []
        try:
            data = json.loads(proc.stdout or "{}")
        except json.JSONDecodeError:
            data = {}
        for res in data.get("results", []):
            diags.append(
                Diagnostic(
                    ruleId=res.get("test_id", "BANDIT"),
                    message=res.get("issue_text", ""),
                    severity=DiagnosticSeverity.warning,
                    path=res.get("filename", ""),
                    line=int(res.get("line_number", 1)),
                    col=0,
                    source=self.name,
                )
            )
        return diags
