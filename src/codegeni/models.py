from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class DiagnosticSeverity(str, Enum):
    info = "info"
    warning = "warning"
    error = "error"


class Suggestion(BaseModel):
    """A suggested improvement for a finding."""

    text: str
    diff: Optional[str] = None  # unified diff (optional)


class Diagnostic(BaseModel):
    """A unified diagnostic produced by an analyzer."""

    ruleId: str
    message: str
    severity: DiagnosticSeverity
    path: str
    line: int
    col: int
    endLine: Optional[int] = None
    endCol: Optional[int] = None
    source: str  # which analyzer produced this
    suggestions: List[Suggestion] = []
