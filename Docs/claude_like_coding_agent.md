# Claude-like Coding Agent using CodeGeni

## Overview
This document describes how to build a Claude Code–like coding agent using CodeGeni and open-source tools.

https://github.com/anomalyco/codegeni-core

---

## Core Architecture

User Prompt → Planner (CodeGeni) → Agent Loop (LangGraph) → Tool Layer → Memory → Execution → Feedback Loop

                ┌──────────────────────┐
                │      CodeGeni        │
                │   (Reasoning Brain)  │
                └─────────┬────────────┘
                          ↓
                ┌──────────────────────┐
                │      LangGraph       │
                │   (Agent Loop FSM)   │
                └─────────┬────────────┘
                          ↓
        ┌────────────────────────────────────┐
        │           Tool Layer               │
        │  - Open Interpreter               │
        │  - File System                    │
        │  - Git                           │
        │  - Test Runner                   │
        └────────────────────────────────────┘
                          ↓
        ┌────────────────────────────────────┐
        │           Memory Layer             │
        │  - Chroma / Weaviate              │
        │  - Code Embeddings                │
        └────────────────────────────────────┘
                          ↓
        ┌────────────────────────────────────┐
        │        Code Intelligence           │
        │  - Tree-sitter                    │
        │  - Sourcegraph                    │
        └────────────────────────────────────┘
                          ↓
                ┌──────────────────────┐
                │   Docker Sandbox     │
                └──────────────────────┘
---

### Repository mapping

| Diagram Layer | Package / Component | Status |
| --- | --- | --- |
| Reasoning Brain | `packages/codegeni-brain` (`@codegeni/brain`) | ✅ Bun HTTP service exposing `/tasks` |
| LangGraph FSM | `packages/codegeni-langgraph` (`@codegeni/langgraph`) | ✅ Plan → Memory → Code Intel → Tool → Sandbox |
| Tool Layer | `packages/codegeni-tools` + `packages/codegeni-mcp` | ✅ Includes interpreter-style commands via `run_shell` / `docker_exec`, plus FS, Git, and tests |
| Memory Layer | `packages/codegeni-memory` | ✅ Chroma-based RAG with local embeddings |
| Code Intelligence | `packages/codegeni-intelligence` | ✅ Tree-sitter chunking + symbol search (Sourcegraph integration queued) |
| Docker Sandbox | `packages/codegeni-sandbox` + `Dockerfile.sandbox` | ✅ dockerode runner + hardened image |

---

## Recommended Stack

### Agent Orchestration
- LangGraph (primary)
- CrewAI / AutoGen (optional multi-agent)

### Tool Execution
- Open Interpreter (code execution)
- File system tools
- Git integration

### Memory (RAG)
- Chroma (MVP)
- Weaviate (production)

### Code Intelligence
- Tree-sitter (AST parsing)
- Sourcegraph Cody OSS (code search)

### Execution Sandbox
- Docker

### Observability
- Langfuse
- Prometheus + Grafana

### Testing
- Playwright

---

## Minimal MVP Stack
- CodeGeni
- LangGraph
- Open Interpreter
- Chroma
- Docker

---

## Agent Loop (Pseudo Code)

```
while not complete:
    plan = LLM(context)
    action = parse(plan)
    result = execute(action)
    feedback = analyze(result)
    update_context(feedback)
```

---

## Key Features to Implement

- Multi-step planning
- Tool usage (write, run, test)
- Memory (RAG)
- Retry & self-correction
- Error handling

---

## Advanced Features

- Multi-agent system (planner, coder, reviewer)
- AI-based adaptive improvements
- CRM/domain-aware intelligence

---

## Notes

- Do NOT build infra from scratch
- Focus on orchestration and domain logic
- CodeGeni acts as the reasoning engine

---

## Goal

Build a system capable of:
- Writing code
- Executing it
- Fixing errors
- Iterating until completion
