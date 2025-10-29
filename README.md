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
