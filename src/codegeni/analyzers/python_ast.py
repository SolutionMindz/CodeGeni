from __future__ import annotations

import ast
from pathlib import Path
from typing import List

from ..config import Config
from ..models import Diagnostic, DiagnosticSeverity, Suggestion
from .base import Analyzer


class PythonAstAnalyzer(Analyzer):
    name = "python-ast"

    def run(self, root: Path, config: Config) -> List[Diagnostic]:
        diagnostics: List[Diagnostic] = []
        for path in root.rglob("*.py"):
            if config and any(ex in path.parts for ex in config.exclude):
                continue
            try:
                source = path.read_text(encoding="utf-8")
            except Exception:
                continue

            try:
                tree = ast.parse(source)
            except SyntaxError as e:
                diagnostics.append(
                    Diagnostic(
                        ruleId="PY-SYNTAX",
                        message=f"Syntax error: {e.msg}",
                        severity=DiagnosticSeverity.error,
                        path=str(path.relative_to(root)),
                        line=e.lineno or 1,
                        col=e.offset or 0,
                        source=self.name,
                    )
                )
                continue

            diagnostics.extend(self._check_function_lengths(root, path, source, tree, config))
            diagnostics.extend(self._check_nesting_depth(root, path, source, tree, config))
        return diagnostics

    def _check_function_lengths(self, root: Path, path: Path, source: str, tree: ast.AST, config: Config) -> List[Diagnostic]:
        max_lines = config.python.max_function_lines
        diags: List[Diagnostic] = []
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
                
            start = node.lineno
            end = getattr(node, "end_lineno", None)
            if end is None:
                # Fallback: estimate using last node in body
                end = getattr(node.body[-1], "lineno", start) if node.body else start
            
            length = max(0, end - start + 1)
            if length <= max_lines:
                continue
                
            diags.append(
                Diagnostic(
                    ruleId="PY001",
                    message=f"Function '{node.name}' is {length} lines (>{max_lines}). Consider refactoring into smaller functions.",
                    severity=DiagnosticSeverity.warning,
                    path=str(path.relative_to(root)),
                    line=start,
                    col=0,
                    endLine=end,
                    endCol=0,
                    source=self.name,
                    suggestions=[
                        Suggestion(text="Extract helper functions to reduce function length and improve readability."),
                    ],
                )
            )
        return diags

    def _check_nesting_depth(self, root: Path, path: Path, source: str, tree: ast.AST, config: Config) -> List[Diagnostic]:
        max_depth = config.python.max_nesting_depth
        diags: List[Diagnostic] = []

        compound = (
            ast.If,
            ast.For,
            ast.AsyncFor,
            ast.While,
            ast.Try,
            ast.With,
            ast.AsyncWith,
            ast.FunctionDef,
            ast.AsyncFunctionDef,
            ast.ClassDef,
        )

        def visit(node: ast.AST, depth: int, parent_func: str | None) -> None:
            current_func = parent_func
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                current_func = node.name
                depth = 0  # reset depth inside function for per-function evaluation

            if isinstance(node, compound):
                if depth > max_depth and current_func:
                    diags.append(
                        Diagnostic(
                            ruleId="PY002",
                            message=f"Nesting depth {depth} exceeds max {max_depth} in function '{current_func}'. Consider early returns or refactoring.",
                            severity=DiagnosticSeverity.info,
                            path=str(path.relative_to(root)),
                            line=getattr(node, "lineno", 1),
                            col=0,
                            source=self.name,
                        )
                    )
                depth += 1

            for child in ast.iter_child_nodes(node):
                visit(child, depth, current_func)

        visit(tree, 0, None)
        return diags
