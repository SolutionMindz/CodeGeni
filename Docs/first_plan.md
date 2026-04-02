# CodeGeni Agent — Full Implementation Plan

## Context

Build a Claude-like coding agent by:
1. **Cloning `sst/codegeni-core`** as the base (TypeScript/Bun monorepo with agent loop, LLM routing, session management, SSE streaming already built in)
2. **Converting CodeGeni from Python to TypeScript** as a set of packages inside the CodeGeni monorepo
3. **Keeping Python static analysis CLI tools** (flake8, pylint, bandit, radon) as subprocess calls from TypeScript — they only analyze Python code anyway
4. Building bottom-up: Tool Layer → Memory → Code Intelligence → Sandbox → CodeGeni reasoning brain drives everything

CodeGeni already provides: multi-agent system, LLM routing (75+ providers), tool calling, session management, SSE streaming, MCP support. We do NOT rebuild these — we extend them.

---

## What CodeGeni Gives Us for Free

| Capability | CodeGeni built-in | Our work |
|---|---|---|
| LLM routing | ✅ 75+ providers (Claude, GPT, Ollama, etc.) | Just configure model |
| Agent loop | ✅ Build Agent + Plan Agent + Sub-Agents | Add custom agents |
| Session management | ✅ Sessions API | Reuse |
| SSE streaming | ✅ Events API | Reuse |
| MCP support | ✅ MCP servers | Expose our tools |
| Tool calling | ✅ OpenAI function-calling format | Register our tools |
| File permission model | ✅ read/write/execute controls | Reuse |
| Multi-interface | ✅ TUI + Desktop + VS Code + Web | Extend VS Code extension |

---

## Target Architecture (Revised)

```
┌────────────────────────────────────────────────┐
│           CodeGeni (Reasoning Brain)           │
│  - Multi-agent system (Build/Plan/Sub-Agents) │
│  - LLM Router (75+ providers incl. Ollama)    │
│  - Session + Context management               │
│  - SSE streaming                              │
└───────────────────┬────────────────────────────┘
                    │ tool calls via MCP / direct
┌───────────────────▼────────────────────────────┐
│          LangGraph FSM (Phase 5)               │
│  - Custom workflow orchestration               │
│  - Confidence scoring, retry logic             │
│  Note: may not be needed — CodeGeni has        │
│  built-in multi-step agent loop already        │
└───────────────────┬────────────────────────────┘
                    │
┌───────────────────▼────────────────────────────┐
│              Tool Layer (Phase 1)              │
│  - read_file, write_file, list_directory       │
│  - git_status, git_diff, git_commit            │
│  - codegeni_scan (→ Python CLI subprocess)     │
│  - test_runner                                 │
└───────────────────┬────────────────────────────┘
                    │
┌───────────────────▼────────────────────────────┐
│            Memory Layer (Phase 2)              │
│  - ChromaDB (chromadb JS client)               │
│  - Code embeddings (transformers.js)           │
└───────────────────┬────────────────────────────┘
                    │
┌───────────────────▼────────────────────────────┐
│         Code Intelligence (Phase 3)            │
│  - Tree-sitter (node bindings)                 │
│  - AST-aware chunking                          │
└───────────────────┬────────────────────────────┘
                    │
┌───────────────────▼────────────────────────────┐
│            Docker Sandbox (Phase 4)            │
│  - dockerode (npm)                             │
│  - network=none, read-only, resource limits    │
└────────────────────────────────────────────────┘
```

---

## Step 0 — Clone and Understand CodeGeni

```bash
git clone https://github.com/sst/codegeni-core.git
cd codegeni-core
bun install
bun run dev   # start CodeGeni server at localhost:4096
```

CodeGeni is a **Bun monorepo**. Key packages:
```
codegeni-core/
├── packages/
│   ├── codegeni-core/     ← core agent engine (TypeScript)
│   ├── tui/          ← terminal UI
│   ├── web/          ← web interface
│   └── vscode/       ← VS Code extension
├── bun.lockb
└── package.json      ← workspace root
```

Our work: add new packages to this monorepo.

---

## New Monorepo Structure (after our additions)

```
codegeni-core/ (forked)
├── packages/
│   ├── codegeni-core/               ← existing, minimal changes
│   ├── tui/                    ← existing, untouched
│   ├── vscode/                 ← existing, extend with CodeGeni UI
│   │
│   ├── codegeni-tools/         ← Phase 1: tool layer (NEW)
│   │   ├── src/
│   │   │   ├── index.ts        ← exports all tools + registry
│   │   │   ├── base.ts         ← BaseTool interface, ToolRegistry
│   │   │   ├── fs/
│   │   │   │   ├── read-file.ts
│   │   │   │   ├── write-file.ts
│   │   │   │   ├── list-directory.ts
│   │   │   │   └── search-files.ts
│   │   │   ├── git/
│   │   │   │   ├── git-status.ts
│   │   │   │   ├── git-diff.ts
│   │   │   │   └── git-commit.ts
│   │   │   ├── exec/
│   │   │   │   ├── run-shell.ts     ← Phase 1: Bun.spawn, 30s timeout
│   │   │   │   └── docker-exec.ts   ← Phase 4: dockerode sandbox
│   │   │   └── code/
│   │   │       ├── codegeni-scan.ts ← subprocess: calls Python CLI
│   │   │       └── test-runner.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── codegeni-memory/        ← Phase 2: memory + embeddings (NEW)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── store.ts        ← ChromaDB client wrapper
│   │   │   ├── indexer.ts      ← file walker + embed + upsert
│   │   │   └── retriever.ts    ← query() → ranked chunks
│   │   └── package.json
│   │
│   ├── codegeni-intelligence/  ← Phase 3: AST + code search (NEW)
│   │   ├── src/
│   │   │   ├── chunker.ts      ← Tree-sitter AST chunker
│   │   │   └── searcher.ts     ← hybrid semantic + keyword search
│   │   └── package.json
│   │
│   ├── codegeni-sandbox/       ← Phase 4: Docker sandbox (NEW)
│   │   ├── src/
│   │   │   └── docker-runner.ts
│   │   └── package.json
│   │
│   ├── codegeni-langgraph/     ← Phase 5: LangGraph FSM orchestrator (NEW)
│   │   ├── src/
│   │   │   ├── graph.ts        ← Plan → Memory → Code Intel → Tool → Sandbox
│   │   │   └── nodes/          ← individual graph nodes
│   │   └── package.json
│   │
│   ├── codegeni-brain/         ← Phase 5: HTTP reasoning brain (NEW)
│   │   ├── src/
│   │   │   ├── brain.ts        ← wraps LangGraph + tool registry
│   │   │   └── server.ts       ← Bun.serve() REST API
│   │   └── package.json
│   │
│   └── codegeni-mcp/           ← MCP server exposing all tools (NEW)
│       ├── src/
│       │   └── server.ts       ← MCP server: registers all tools for CodeGeni
│       └── package.json
│
├── Dockerfile.sandbox          ← sandbox execution image
└── python/                     ← existing Python CLI tools (kept as-is)
    └── src/codegeni/           ← flake8, pylint, bandit, radon, AST analyzers
```

**Note on Python tools:** The Python static analysis CLI (`codegeni scan`) is kept as-is. TypeScript calls it via `Bun.spawn(["python", "-m", "codegeni", "scan", path, "--format", "json"])` and parses the JSON output.

---

## Tech Stack (TypeScript/Bun)

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | **Bun** | Already in CodeGeni. Fast, native TypeScript, built-in subprocess, fetch, SQLite |
| Language | **TypeScript** | Type-safe, matches CodeGeni codebase |
| Tool schemas | **Zod** | TypeScript-native schema validation (CodeGeni uses it) |
| Vector store | **chromadb** (npm) | Official JS client for ChromaDB |
| Embeddings | **@xenova/transformers** (transformers.js) | Runs in Bun, no Python needed for embeddings |
| AST parsing | **tree-sitter** (node binding) | Language-aware chunking |
| Sandbox | **dockerode** | Docker SDK for Node.js/Bun |
| Agent FSM | **@codegeni/langgraph** | Custom LangGraph-inspired FSM we now ship |
| Reasoning Brain | **@codegeni/brain** | Bun HTTP service that exposes the LangGraph workflow |
| Structured logging | **pino** or CodeGeni's built-in logger | Match existing patterns |
| Testing | **bun test** | Built-in Bun test runner |

---

## Phase 1 — Tool Layer (MVP, No LLM Calls)

**Goal:** A set of registered tools that CodeGeni (or any client) can call. No agent loop yet. Direct tool execution via MCP.

### Tool Interface

```typescript
// packages/codegeni-tools/src/base.ts
export interface ToolInput<T extends z.ZodType> {
  schema: T;
}

export interface Tool<TInput extends z.ZodType, TOutput extends z.ZodType> {
  name: string;
  description: string;
  permission: "read_only" | "write_fs" | "execute" | "git_write";
  streaming: boolean;
  input: TInput;
  output: TOutput;
  execute(input: z.infer<TInput>): Promise<z.infer<TOutput>>;
}
```

### codegeni-scan Tool (bridges Python → TypeScript)

```typescript
// packages/codegeni-tools/src/code/codegeni-scan.ts
export const codeGeniScanTool: Tool<...> = {
  name: "codegeni_scan",
  description: "Run static analysis (flake8, pylint, bandit, radon, AST rules) on a path",
  permission: "read_only",
  streaming: true,
  input: z.object({ path: z.string() }),
  output: z.object({ diagnostics: z.array(DiagnosticSchema), count: z.number() }),

  async execute({ path }) {
    const proc = Bun.spawn(
      ["python", "-m", "codegeni", "scan", path, "--format", "json"],
      { cwd: workspacePath, stdout: "pipe", stderr: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    return { diagnostics: JSON.parse(output), count: ... };
  }
}
```

### MCP Server (exposes tools to CodeGeni)

```typescript
// packages/codegeni-mcp/src/server.ts
// Registers all codegeni-tools as an MCP server
// CodeGeni connects via: codegeni-core config add-mcp codegeni http://localhost:4097
```

### Phase 1 Tool Set

| Tool | Permission | Streaming |
|------|-----------|-----------|
| `read_file` | read_only | No |
| `write_file` | write_fs | No |
| `list_directory` | read_only | No |
| `search_files` | read_only | No |
| `run_shell` | execute | Yes |
| `git_status` | read_only | No |
| `git_diff` | read_only | No |
| `git_commit` | git_write | No |
| `codegeni_scan` | read_only | Yes |
| `test_runner` | execute | Yes |

### Implementation Steps

1. **Fork `sst/codegeni-core`** on GitHub. Clone your fork locally.
2. Run `bun install` at repo root. Verify `bun run dev` starts the CodeGeni server.
3. Create `packages/codegeni-tools/` with `package.json` (name: `@codegeni/tools`), `tsconfig.json`, `src/`
4. `src/base.ts` — `Tool<TInput, TOutput>` interface, `ToolRegistry` class with `register()` and `getAll()`, Zod-based input validation
5. Implement all Phase 1 tools:
   - `fs/read-file.ts` — `Bun.file(path).text()`, path traversal prevention via `path.resolve()` check
   - `fs/write-file.ts` — atomic write: write to `.tmp` then `rename`
   - `fs/list-directory.ts` — `fs.readdir()` with `stat()` for metadata
   - `fs/search-files.ts` — `glob` pattern matching + optional regex content search
   - `exec/run-shell.ts` — `Bun.spawn()`, 30s timeout, stream stdout via async iterator
   - `git/git-status.ts` — `Bun.spawn(["git","status","--porcelain"])`, parse into structured output
   - `git/git-diff.ts` — `git diff [--staged] [file]`
   - `git/git-commit.ts` — `git add <files> && git commit -m <msg>`
   - `code/codegeni-scan.ts` — `Bun.spawn(["python","-m","codegeni","scan",...])`, parse JSON
   - `code/test-runner.ts` — `Bun.spawn(["pytest","--json-report"])`, parse output
6. Create `packages/codegeni-mcp/` — MCP server that registers all tools. CodeGeni connects to it.
7. Configure CodeGeni to load the MCP server: edit `codegeni-core.json` config.
8. Tests: `bun test` in `packages/codegeni-tools/`. Use `tmp` directory fixtures. Test each tool.

---

## Phase 2 — Memory Layer

**Goal:** ChromaDB vector store + embeddings. Index workspaces, enable semantic search.

### ChromaDB Collection Schema

```
Collection: codebase_{hash(workspacePath, 12)}
id:        "{filePath}::{chunkIndex}"
embedding: float[384]
document:  str
metadata: {
  filePath, language, chunkType,   // "file" in Phase 2, "function" in Phase 3
  startLine, endLine, indexedAt, fileMtime
}
```

### New Tools

| Tool | Description |
|------|-------------|
| `index_workspace` | Walk workspace, embed all files, upsert into ChromaDB |
| `search_codebase` | Semantic search over indexed workspace |

### Implementation Steps

9. `bun add chromadb @xenova/transformers` in `packages/codegeni-memory/`
10. `src/store.ts` — `ChromaDB` client, `getOrCreateCollection()`, `upsertChunks()`, `query()`, `deleteWorkspace()`
11. `src/indexer.ts` — file walker, line-range chunks (Phase 2), embed with `pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")`, staleness check via `fileMtime`, batch upsert (64 docs)
12. `src/retriever.ts` — embed query → top-10 ChromaDB results → similarity filter (>0.4) → return top 5
13. Add `index_workspace` and `search_codebase` to `codegeni-tools`, register in MCP server
14. Add `docker-compose.yml` with ChromaDB service (or use embedded mode for dev)

---

## Phase 3 — Code Intelligence

**Goal:** Tree-sitter AST-aware chunking. Replace line-range chunks with function/class-level chunks.

### Implementation Steps

15. `bun add tree-sitter tree-sitter-python tree-sitter-javascript tree-sitter-typescript` in `packages/codegeni-intelligence/`
16. `src/chunker.ts` — parser per language, extract `function_definition`/`class_definition`/`method_definition` nodes, emit `CodeChunk` objects with `symbolName`, `symbolType`, `signature`, `body`. Guard: if chunk > 512 tokens, split at inner boundaries.
17. Upgrade `packages/codegeni-memory/src/indexer.ts` to use `Chunker` instead of line-range splitting
18. `src/searcher.ts` — hybrid: semantic (ChromaDB) + keyword (regex over chunk text), merge and rank
19. Add `find_symbol` tool: search by function/class name across indexed workspace

---

## Phase 4 — Docker Sandbox

**Goal:** Sandboxed code execution. Replace host-shell execution for anything that runs code.

### Sandbox Security Profile

```typescript
// packages/codegeni-sandbox/src/docker-runner.ts
const SANDBOX_OPTIONS = {
  NetworkDisabled: true,
  HostConfig: {
    CapDrop: ["ALL"],
    SecurityOpt: ["no-new-privileges:true"],
    ReadonlyRootfs: true,
    Tmpfs: { "/tmp": "size=64m,noexec" },
    Memory: 256 * 1024 * 1024,
    MemorySwap: 256 * 1024 * 1024,
    CpuPeriod: 100000,
    CpuQuota: 50000,
    PidsLimit: 64,
    Binds: [`${workspacePath}:/workspace:rw`],
  },
  User: "1000:1000",
};
// Always: container.remove({ force: true }) in finally block
```

### Dockerfile.sandbox

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y nodejs npm git bash \
    && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 sandbox
USER sandbox
WORKDIR /workspace
```

### Implementation Steps

20. `bun add dockerode @types/dockerode` in `packages/codegeni-sandbox/`
21. `src/docker-runner.ts` — `run(image, command, workspacePath, timeoutSec)` → `{exitCode, stdout, stderr}`. Hard timeout via `setTimeout` + `container.kill()`.
22. Upgrade `test-runner` tool to use `DockerRunner` instead of `Bun.spawn`
23. Add `docker_exec` tool for arbitrary code execution in sandbox
24. Build and tag `Dockerfile.sandbox` as `codegeni-sandbox:latest`

---

## Phase 5 — CodeGeni as Full Reasoning Brain

We now ship the reasoning layers instead of relying on an external fork:

1. **`@codegeni/langgraph`** defines the FSM: Plan → Memory → Code Intelligence → Tool Execution → Sandbox. Each stage is a node (`PlanNode`, `MemoryNode`, etc.) that calls the shared tool registry.
2. **`@codegeni/brain`** wraps the LangGraph workflow in a Bun HTTP service. Clients POST `goal` + `workspaceRoot` to `/tasks` and receive the synthesized plan, event log, and artifacts.
3. The MCP server (`@codegeni/mcp`) continues to expose the actual tools. The brain talks directly to the registry, so CodeGeni front-ends only need to call the new service.

### Running the Brain

```bash
CHROMADB_URL=http://localhost:8000 CODEGENI_WORKSPACE=$PWD bun run --cwd packages/codegeni-mcp dev &
CODEGENI_WORKSPACE=$PWD CODEGENI_BRAIN_PORT=4100 bun run --cwd packages/codegeni-brain dev
```

### Sample Request

```bash
curl -X POST http://localhost:4100/tasks \\
  -H 'content-type: application/json' \\
  -d '{
        "goal": "stabilize failing tests",
        "workspaceRoot": "/workspace/CodeGeni"
      }'
```

Response fields:
- `plan`: ordered list of tool invocations
- `events`: LangGraph stage-by-stage events (plan, memory, code_intel, tool, sandbox, summary)
- `artifacts`: raw tool outputs (index stats, semantic matches, docker logs, etc.)

Use `codegeni.agent.json` as the canonical wiring doc—it now includes both the MCP endpoint and the brain URL/workflow name.

---

## Phase 6 — SaaS Readiness

- Tenant isolation: per-tenant ChromaDB collections, per-tenant Docker resource limits
- Auth: JWT + API key middleware (in CodeGeni's server layer)
- Rate limiting: CodeGeni already has some controls; extend with Redis token bucket
- Admin API: tenant management, usage metering
- Kubernetes Helm chart with HPA

---

## Critical Files

### Fork (modify)
- `packages/codegeni-core/src/` — minimal changes, add MCP client config
- `packages/vscode/src/` — extend VS Code extension UI for CodeGeni features

### Create (new packages)
- `packages/codegeni-tools/` — Phase 1
- `packages/codegeni-memory/` — Phase 2
- `packages/codegeni-intelligence/` — Phase 3
- `packages/codegeni-sandbox/` — Phase 4
- `packages/codegeni-langgraph/` — Phase 5 LangGraph FSM
- `packages/codegeni-brain/` — Phase 5 HTTP reasoning brain
- `packages/codegeni-mcp/` — MCP server (wires tools into CodeGeni)
- `Dockerfile.sandbox`
- `docker-compose.yml` (ChromaDB + CodeGeni + Langfuse)

### Keep as-is (Python CLI, called via subprocess)
- `python/src/codegeni/` — existing analyzers, runner, CLI (no changes)

---

## Verification

### After Phase 1
```bash
# Clone and setup
git clone https://github.com/YOUR_FORK/codegeni-core.git
cd codegeni-core && bun install

# Start the MCP tool server
bun run --cwd packages/codegeni-mcp dev   # port 4097

# Start CodeGeni
bun run dev   # port 4096

# Test tool directly
curl -X POST http://localhost:4097/tools/read_file/execute \
  -d '{"workspace_path":"/my/project","input":{"path":"README.md"}}'
```

### After Phase 5 (Full Agent)
```bash
# CodeGeni TUI — ask it to fix flake8 issues
codegeni-core "Fix all flake8 violations in this project"
# Agent should: call codegeni_scan → read affected files → write fixes → run tests
```

---

## Docs Update

The original `Docs/claude_like_coding_agent.md` should be rewritten to reflect:
1. CodeGeni is the base (fork `sst/codegeni-core`, not `anomalyco/codegeni-core`)
2. Tech stack is TypeScript/Bun, not Python
3. Python CLI tools are subprocesses, not the primary stack
4. Layers are built bottom-up
5. This implementation plan replaces the original sketch
