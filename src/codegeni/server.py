from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel

from .config import load_config
from .runner import run_scan
from .models import Diagnostic


class ScanRequest(BaseModel):
    path: str
    configOverrides: Optional[Dict[str, Any]] = None


def create_app() -> FastAPI:
    app = FastAPI(title="CodeGeni API", version="0.1.0")

    @app.get("/healthz")
    def healthz() -> Dict[str, str]:
        return {"status": "ok"}

    @app.post("/scan")
    def scan(req: ScanRequest) -> List[Dict[str, Any]]:
        path = Path(req.path)
        cfg = load_config(path)
        # Note: simple override merge; keep shallow for now
        if req.configOverrides:
            for k, v in req.configOverrides.items():
                if hasattr(cfg, k):  # type: ignore[attr-defined]
                    setattr(cfg, k, v)  # type: ignore[attr-defined]
        diags = run_scan(path, cfg)
        return [d.model_dump() for d in diags]

    return app
