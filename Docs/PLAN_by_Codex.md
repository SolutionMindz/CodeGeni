**Plan: CodeGeni VS Code UI Implementation**

### Summary
- Implement the CodeGeni VS Code extension in four phases that align with `Docs/codegeni_ui_plan.md`.
- Deliver a Codex-like chat UI that talks to the local CodeGeni brain/MCP services, progressively adding transparency, control, and SaaS-ready hooks.

### Implementation Details
1. **Phase 1 – MVP Chat Sidebar**
   - Create a `WebviewViewProvider` (e.g., `ChatPanelProvider`) registered in `package.json` to replace the current tree view.
   - Front-end: bundle a lightweight React/Svelte UI (via Webpack/Rollup) with components for chat history, input box, and status indicator. Persist state via VS Code `globalState`.
   - Back-end: add a `ChatService` in the extension host that invokes the local brain (`CODEGENI_BRAIN_PORT`), streaming text via incremental updates (fallback: poll every 250 ms).
   - Commands: `codegeni.chat.send`, `codegeni.chat.cancel`, `codegeni.chat.open`.
   - Networking: configurable endpoints (`codegeni.brainUrl`, `codegeni.mcpUrl`) surfaced in `package.json` contributions.

2. **Phase 2 – Interactive Experience**
   - Timeline: extend the webview UI to render step events (plan, memory, code_intel, tool, sandbox, summary). Use `vscode.postMessage` to push events from the extension whenever brain responses stream in.
   - Streaming: upgrade `ChatService` to use fetch streaming (Node 18 `ReadableStream`), forwarding chunks to the webview for real-time rendering.
   - Diff Preview: leverage `vscode.workspace.applyEdit` preview pipeline: when a tool result includes `write_file`, fetch diffs from MCP (`git_diff`) and present via `vscode.diff` before accepting. Add Accept/Discard buttons in the chat.
   - File pins: inline file open buttons referencing workspace files.

3. **Phase 3 – Control & Observability**
   - Tool log panel: embed a tab/accordion in the webview showing structured entries (`tool`, `args`, `stdout/stderr`, exit code). Provide filtering/timestamps.
   - Execution modes: expose a toggle (Auto / Manual). Manual mode queues plan steps and only executes when the user clicks “Approve”. This requires `ChatService` to intercept plan steps and call MCP tools individually rather than letting the brain auto-run.
   - Context panel: sidebar section summarizing active files, embeddings hits, memory stats. Pull from `search_codebase`/`index_workspace` outputs already returned by the brain.
   - Persistence: store session transcripts + approvals in `extensionContext.storagePath` for reload.

4. **Phase 4 – Advanced Capabilities**
   - Multi-agent UI: restructure chat history to include agent identity chips (planner/coder/reviewer). Color-code events and allow per-agent filtering.
   - Memory visualization: integrate a mini graph/table showing top memory hits (chunk snippet + similarity) using existing results; optionally embed a simple charts library.
   - SaaS-ready auth: add settings for API key/JWT, plus a login panel (modal webview) that stores tokens in VS Code secret storage. Ensure brain/MCP requests attach headers when configured.

### Test Plan
- **Unit/Integration (extension)**: add Jest/Mocha tests for `ChatService` request lifecycle, timeline parsing, approval queue logic, and settings serialization.
- **VS Code UI tests**: extend `src/test` to launch the webview, send a mock chat, and assert DOM updates via `vscode-extension-tester` or playwright-driven VS Code (`CODEGENI_UI_TEST=1`).
- **End-to-end**: reuse Playwright API fixtures to spin up MCP + brain, then run `CODEGENI_RUN_VSCODE_E2E=1 npx playwright test tests/playwright/vscode-extension.spec.ts` enhanced with chat automation (e.g., via VS Code’s Testing API) to verify streaming, timeline rendering, and diff previews.
- **Manual**: smoke test Auto vs Manual modes, diff previews, and Sourcegraph backlog acknowledgement.

### Assumptions
- Backend brain/MCP endpoints already expose plan events, tool results, diffs, and can be called individually when we implement approval mode.
- We can bundle a small framework (React/Svelte) inside the extension without size constraints; otherwise, we’ll fallback to vanilla web components.
- Sourcegraph integration is a future enhancement; Phase 4 Memory visualization uses existing RAG outputs only.
