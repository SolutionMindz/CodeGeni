from __future__ import annotations

from pathlib import Path
from typing import List

from ..config import Config
from ..models import Diagnostic


class Analyzer:
    name: str = "base"

    def run(self, root: Path, config: Config) -> List[Diagnostic]:
        raise NotImplementedError
