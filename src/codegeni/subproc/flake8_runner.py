from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import List

from ..config import Config
from ..models import Diagnostic, DiagnosticSeverity
from ..analyzers.base import Analyzer


class Flake8Analyzer(Analyzer):
    name = "flake8"

    def run(self, root: Path, config: Config) -> List[Diagnostic]:
        if not shutil.which("flake8"):
            return []
        cmd = ["flake8", str(root), "--format=%(path)s::%(row)d::%(col)d::%(code)s::%(text)s"]
        try:
            proc = subprocess.run(cmd, cwd=str(root), capture_output=True, text=True, check=False)
        except Exception:
            return []
        if proc.returncode not in (0, 1):
            # 0: no issues; 1: issues found
            return []
        diags: List[Diagnostic] = []
        for line in proc.stdout.splitlines():
            try:
                path, row, col, code, text = line.split("::", 4)
                diags.append(
                    Diagnostic(
                        ruleId=code,
                        message=text.strip(),
                        severity=DiagnosticSeverity.warning,
                        path=path,
                        line=int(row),
                        col=int(col),
                        source=self.name,
                    )
                )
            except ValueError:
                continue
        return diags
