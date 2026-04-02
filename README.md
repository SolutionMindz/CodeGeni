<div align="center">
  <img src="assets/logo-256.png" alt="CodeGeni Logo" width="128" height="128">
  <h1>CodeGeni</h1>
  <p><strong>AI-Assisted Code Review Engine</strong></p>
  <p>
    <em>Unifying static analyzers, AST rules, and structured diagnostics</em>
  </p>
</div>

---

## About

CodeGeni is an AI-assisted code review engine that unifies static analyzers, AST rules, and structured diagnostics for integration with a VS Code extension.

This package provides:
- A CLI (`codegeni`) to scan a workspace
- Unified JSON diagnostics across multiple analyzers
- Simple Python AST-based rules
- Optional local server (FastAPI) for programmatic access
  
Directory layout:

```
src/
  codegeni/
    analyzers/        # built-in analyzers (python-ast) and subprocess wrappers
    subproc/          # subprocess runners for flake8/pylint/bandit/radon
    cli.py            # CLI entry point
    config.py         # config discovery and models
    models.py         # diagnostic data models (Pydantic)
    runner.py         # orchestrates analyzers
    server.py         # optional FastAPI app
extensions/
  vscode-codegeni/    # VS Code extension skeleton (TypeScript)
tests/
  test_runner.py
```

## Quick start

1) Install (editable) with optional analyzers:
```bash
pip install -e .[analyzers]
```

2) Run a scan on the current directory:
```bash
codegeni scan . --format json > report.json
```

3) Use a config file (auto-discovered):
- `.codegeni.yaml` in project root, or
- `[tool.codegeni]` table in `pyproject.toml`

Example `.codegeni.yaml`:
```yaml
enable: true
analyzers: [flake8, pylint, bandit, radon, python-ast]
severity_threshold: info
exclude: [".git", ".venv", "node_modules", "dist", "build"]
python:
  max_function_lines: 60
  max_nesting_depth: 3
```

This repo includes a sample `.codegeni.yaml` at the root.

## CLI

```bash
codegeni scan <path> [--format json|ndjson|text] [--config <file>] [--no-color]
```

- Scans files under `<path>` applying configured analyzers
- Outputs diagnostics with fields: `ruleId`, `message`, `severity`, `path`, `line`, `col`, `endLine`, `endCol`, `source`, `suggestions`

## Server (optional)

```bash
pip install -e .[server,analyzers]
codegeni serve --host 127.0.0.1 --port 8899
```

- POST `/scan` with `{ path, configOverrides? }` → returns diagnostics JSON

## VS Code extension (skeleton)

There is a minimal VS Code extension skeleton under `extensions/vscode-codegeni`.

Development steps:

```bash
cd extensions/vscode-codegeni
npm install
npm run watch
```

Then press F5 in VS Code to launch the extension host. Use the command palette and run "CodeGeni: Scan Workspace" to trigger a workspace scan using the `codegeni` CLI.

## VS Code integration

- The VS Code extension can spawn the CLI or call the local server.
- Use exit code `0` for success, `1` for internal failure.
- Non-empty diagnostics are not an error condition.

## CodeGeni Agent Stack (TypeScript/Bun)

The repository now includes a Bun-based monorepo that implements the multi-layer plan from `Docs/first_plan.md`. It lives under `packages/` and introduces the following packages:

| Package | Description |
| --- | --- |
| `@codegeni/tools` | Tool layer (filesystem, git, exec, diagnostics, sandbox, memory adapters) |
| `@codegeni/memory` | Chroma-backed vector store with local embeddings and workspace indexer |
| `@codegeni/intelligence` | Tree-sitter powered chunker + symbol search utilities |
| `@codegeni/langgraph` | LangGraph-inspired FSM that orchestrates planning → memory → execution |
| `@codegeni/brain` | HTTP reasoning brain that exposes the LangGraph workflow as a service |
| `@codegeni/sandbox` | Docker sandbox runner used by the exec/test tools |
| `@codegeni/mcp` | Lightweight HTTP MCP server exposing every tool to the reasoning brain |

### Install dependencies

```bash
# Requires Bun (https://bun.sh)
bun install
```

### Build all packages

```bash
bun run build
```

### Run the MCP tool server

```bash
CHROMADB_URL=http://localhost:8000 \
CODEGENI_WORKSPACE=$PWD \
bun run --cwd packages/codegeni-mcp dev
```

### Optional: bring up the full stack with Docker Compose

```bash
docker compose up
```

This starts `chromadb` and the `codegeni-mcp` server inside a Bun container using the settings from `docker-compose.yml`.

### Run the CodeGeni Brain (LangGraph layer)

The reasoning layer lives in `packages/codegeni-brain` and composes the LangGraph workflow with the MCP tool registry. It exposes a lightweight HTTP API at `/tasks`.

```bash
CODEGENI_WORKSPACE=$PWD \
CODEGENI_BRAIN_PORT=4100 \
bun run --cwd packages/codegeni-brain dev
```

Send a task:

```bash
curl -X POST http://localhost:4100/tasks \
  -H 'content-type: application/json' \
  -d '{ "goal": "analyze test failures", "workspaceRoot": "'$PWD'" }'
```

The response includes the synthesized plan, LangGraph events (Plan → Memory → Code Intelligence → Tool → Sandbox), and any artifacts captured from tool executions.

### Agent configuration

Use `codegeni.agent.json` as a template for wiring the MCP server and the new brain service into your preferred front-end (TUI, desktop, or VS Code extension). The file now includes:

- `brain.url` – HTTP endpoint for the LangGraph workflow (`packages/codegeni-brain`)
- `brain.workflow` – Identifier for telemetry/logging (`codegeni-langgraph`)
- `agents.*` – Builder/reviewer personas with explicit tool lists

Point your UI at the MCP server for tool execution and at the brain endpoint for higher-level orchestration.

### Sandbox image

`Dockerfile.sandbox` defines the locked-down execution environment used by the `docker_exec` and `test_runner` tools. Build it locally and tag it as `codegeni-sandbox:latest`:

```bash
docker build -t codegeni-sandbox:latest -f Dockerfile.sandbox .
```

## Playwright Contract Tests

The repository includes Playwright API tests for the planned MCP HTTP surface. These are intended to run in parallel with implementation work and serve as an executable contract for the first tool layer.

Install JavaScript dependencies and run the suite against a live server:

```bash
bun install
CODEGENI_E2E_BASE_URL=http://127.0.0.1:4097 bun run test:e2e
```

The suite currently covers live MCP envelope endpoints, request validation, and a set of future file-tool behaviors marked as `fixme` until the implementations land.

## Brand Assets

Official CodeGeni logos and brand assets are available in the [`assets/`](assets/) directory:
- `logo-128.png` - VS Code extension icon
- `logo-256.png` - Small web usage
- `logo-512.png` - Medium web usage, social media
- `logo-1024.png` - High-resolution for print

See [assets/README.md](assets/README.md) for brand guidelines.

## License

MIT

---

<div align="center">
  <img src="assets/logo-128.png" alt="CodeGeni" width="64" height="64">
  <p><strong>CodeGeni</strong> - AI-Assisted Code Review</p>
  <p>© 2025 <strong>SolutionMind</strong></p>
</div>
