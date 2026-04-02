# CodeGeni VS Code UI Implementation Plan (Codex-like)

## Overview
This document outlines the phased implementation plan for building a Codex-like UI for the CodeGeni coding agent as a VS Code extension.

---

## Phase 1 (2–3 days) – MVP UI

### Goals
- Establish basic interaction layer between user and agent

### Features
- Basic sidebar (VS Code Webview)
- Chat input/output interface
- API integration with local backend agent

### Deliverables
- Working VS Code extension
- Chat-based interaction with backend

---

## Phase 2 (1 week) – Interactive Experience

### Goals
- Improve transparency and usability

### Features
- Task execution timeline (step-by-step agent actions)
- Streaming responses from backend
- File diff preview before applying changes

### Deliverables
- Real-time feedback UI
- Safe code editing experience

---

## Phase 3 (1–2 weeks) – Control & Observability

### Goals
- Give users control and visibility into agent behavior

### Features
- Tool execution logs (commands, file edits, test runs)
- Approval system (manual/auto execution modes)
- Context panel (files, memory, tokens)

### Deliverables
- Transparent execution tracking
- User-controlled automation

---

## Phase 4 – Advanced Capabilities

### Goals
- Move toward production-grade and SaaS-ready system

### Features
- Multi-agent UI (planner, coder, reviewer separation)
- Memory visualization (RAG context insights)
- SaaS-ready authentication (future-ready, still local-first)

### Deliverables
- Scalable UI architecture
- Foundation for multi-tenant SaaS

---

## Notes

- System is **local-first** (no external dependency)
- Rate limiting is intentionally excluded for now
- Architecture should support future SaaS evolution

---

## End Goal

A production-grade, Codex-like developer experience inside VS Code with:
- Full agent visibility
- Controlled execution
- Seamless developer workflow
