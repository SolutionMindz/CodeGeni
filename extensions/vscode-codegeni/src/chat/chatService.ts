import * as vscode from "vscode";
import { v4 as uuid } from "uuid";
import { ChatMessage, ChatSessionState, GraphEvent, ToolLogEntry, MemoryHit, ChatServiceOptions, AgentRole } from "./types";
import { McpClient } from "./mcpClient";

const SESSION_STATE_KEY = "codegeni.chat.session";
const API_KEY_SECRET = "codegeni.apiKey";

interface BrainRequestBody {
  goal: string;
  workspaceRoot: string;
  mode: "auto" | "manual";
}

export class ChatService {
  private session: ChatSessionState;
  private abortController?: AbortController;
  private readonly emitter = new vscode.EventEmitter<ChatSessionState>();

  public readonly onDidChangeSession = this.emitter.event;
  private readonly mcpClient = new McpClient(this.context);

  constructor(private readonly context: vscode.ExtensionContext) {
    this.session = this.context.globalState.get<ChatSessionState>(SESSION_STATE_KEY) ?? {
      messages: [],
      mode: vscode.workspace.getConfiguration("codegeni").get("chat.mode", "auto"),
      pinnedFiles: [],
      isStreaming: false,
      agentFilter: "all"
    };
  }

  getState(): ChatSessionState {
    return this.session;
  }

  async setMode(mode: "auto" | "manual"): Promise<void> {
    this.session = { ...this.session, mode };
    await this.persist();
    this.emitter.fire(this.session);
  }

  async setAgentFilter(agent: AgentRole | "all"): Promise<void> {
    this.session = { ...this.session, agentFilter: agent };
    await this.persist();
    this.emitter.fire(this.session);
  }

  async sendMessage(text: string, options: ChatServiceOptions): Promise<void> {
    if (!text.trim()) {
      return;
    }

    const workspaceRoot = options.workspaceRoot?.fsPath;
    if (!workspaceRoot) {
      vscode.window.showWarningMessage("CodeGeni: Open a workspace folder to chat with the agent.");
      return;
    }

    const userMessage: ChatMessage = {
      id: uuid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      status: "complete"
    };

    const assistantMessage: ChatMessage = {
      id: uuid(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      status: "streaming",
      events: [],
      toolLogs: [],
      memory: []
    };

    this.session = {
      ...this.session,
      messages: [...this.session.messages, userMessage, assistantMessage],
      isStreaming: true
    };
    this.emitter.fire(this.session);

    await this.persist();

    const body: BrainRequestBody = {
      goal: text,
      workspaceRoot,
      mode: this.session.mode
    };

    const controller = new AbortController();
    this.abortController = controller;

    try {
      const response = await this.invokeBrain(body, controller.signal);
      assistantMessage.status = "complete";
      assistantMessage.content = response.summary;
      assistantMessage.events = response.events;
      assistantMessage.toolLogs = response.toolLogs;
      assistantMessage.memory = response.memoryHits;
      assistantMessage.diffTargets = response.diffTargets;
      assistantMessage.agents = response.agents;
      this.session = { ...this.session, isStreaming: false };
      await this.persist();
      this.emitter.fire(this.session);
    } catch (error) {
      assistantMessage.status = "error";
      assistantMessage.content = error instanceof Error ? error.message : String(error);
      this.session = { ...this.session, isStreaming: false };
      await this.persist();
      this.emitter.fire(this.session);
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = undefined;
    this.session = { ...this.session, isStreaming: false };
    this.emitter.fire(this.session);
  }

  async storeApiKey(value: string): Promise<void> {
    await this.context.secrets.store(API_KEY_SECRET, value.trim());
  }

  async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(API_KEY_SECRET);
  }

  async showDiff(relativePath: string, workspaceRoot?: vscode.Uri): Promise<void> {
    const folder = workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!folder) {
      vscode.window.showWarningMessage("CodeGeni: No workspace selected for diff.");
      return;
    }
    try {
      const result = await this.mcpClient.executeTool("git_diff", { path: relativePath }, folder.fsPath);
      const diffContent = typeof result?.diff === "string" ? result.diff : "No diff returned.";
      const left = vscode.Uri.joinPath(folder, relativePath);
      const rightDoc = await vscode.workspace.openTextDocument({ content: diffContent, language: "diff" });
      await vscode.commands.executeCommand("vscode.diff", left, rightDoc.uri, `CodeGeni diff: ${relativePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  private async invokeBrain(body: BrainRequestBody, signal: AbortSignal): Promise<{
    summary: string;
    events: GraphEvent[];
    toolLogs: ToolLogEntry[];
    memoryHits: MemoryHit[];
    diffTargets: string[];
    agents: AgentRole[];
  }> {
    const config = vscode.workspace.getConfiguration("codegeni");
    const brainUrl = config.get<string>("brainUrl", "http://localhost:4100");
    const polling = config.get<number>("chat.streamPollingInterval", 250);
    const apiKey = await this.context.secrets.get(API_KEY_SECRET);
    const response = await fetch(`${brainUrl.replace(/\/$/, "")}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Brain request failed: ${response.status} ${text}`);
    }

    if (response.body && response.body.getReader) {
      return await this.consumeStream(response.body, polling);
    }

    const payload = (await response.json()) as any;
    return this.buildResultFromPayload(payload);
  }

  private async consumeStream(body: ReadableStream<Uint8Array>, polling: number) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const timeline: GraphEvent[] = [];
    const toolLogs: ToolLogEntry[] = [];
    const memoryHits: MemoryHit[] = [];
    const diffTargets: string[] = [];
    let summary = "";
    const agents = new Set<AgentRole>();

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const segments = buffer.split("\n\n");
      buffer = segments.pop() ?? "";
      for (const segment of segments) {
        if (!segment.trim()) {
          continue;
        }
        try {
          const payload = JSON.parse(segment);
          const result = this.buildResultFromPayload(payload);
          summary = result.summary;
          timeline.push(...result.events);
          toolLogs.push(...result.toolLogs);
          memoryHits.push(...result.memoryHits);
          diffTargets.push(...result.diffTargets);
          result.agents.forEach((agent) => agents.add(agent));
          this.session = {
            ...this.session,
            messages: this.session.messages.map((msg) =>
              msg.status === "streaming"
                ? {
                    ...msg,
                    content: summary,
                    events: timeline.slice(),
                    toolLogs: toolLogs.slice(),
                    memory: memoryHits.slice(),
                    diffTargets: diffTargets.slice(),
                    agents: Array.from(agents)
                  }
                : msg
            )
          };
          this.emitter.fire(this.session);
        } catch {
          // ignore chunk parsing errors
        }
      }
      await new Promise((resolve) => setTimeout(resolve, polling));
    }

    if (buffer.trim()) {
      const payload = JSON.parse(buffer);
      const result = this.buildResultFromPayload(payload);
      summary = result.summary;
      timeline.push(...result.events);
      toolLogs.push(...result.toolLogs);
      memoryHits.push(...result.memoryHits);
      diffTargets.push(...result.diffTargets);
      result.agents.forEach((agent) => agents.add(agent));
    }

    return { summary, events: timeline, toolLogs, memoryHits, diffTargets, agents: Array.from(agents) };
  }

  private buildResultFromPayload(payload: any) {
    const events: GraphEvent[] = Array.isArray(payload?.events) ? payload.events : [];
    const toolLogs: ToolLogEntry[] = this.extractToolLogs(payload?.artifacts);
    const memoryHits: MemoryHit[] = this.extractMemoryHits(payload?.artifacts);
    const diffTargets = this.extractDiffTargets(payload?.artifacts);
    const summary = payload?.summary ?? this.formatSummary(payload);
    const agents = this.deriveAgents(events);

    return { summary, events, toolLogs, memoryHits, diffTargets, agents };
  }

  private extractToolLogs(artifacts: any): ToolLogEntry[] {
    const raw = artifacts?.toolResults;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((entry, index) => ({
      id: entry?.id ?? `tool-${index}`,
      tool: entry?.tool ?? entry?.name ?? "unknown",
      args: entry?.args ?? {},
      stdout: entry?.result?.stdout,
      stderr: entry?.result?.stderr,
      exitCode: entry?.result?.exitCode
    }));
  }

  private extractMemoryHits(artifacts: any): MemoryHit[] {
    const raw = artifacts?.memory ?? artifacts?.memoryHits;
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((hit) => ({
      filePath: hit?.filePath ?? hit?.chunk?.filePath ?? "",
      score: typeof hit?.score === "number" ? hit.score : 0,
      chunk: hit?.chunk?.text ?? hit?.chunk?.document ?? hit?.chunk
    }));
  }

  private extractDiffTargets(artifacts: any): string[] {
    const results = artifacts?.toolResults;
    if (!Array.isArray(results)) {
      return [];
    }
    const paths = new Set<string>();
    for (const entry of results) {
      if (entry?.tool === "write_file" && typeof entry?.args?.path === "string") {
        paths.add(entry.args.path);
      }
    }
    return Array.from(paths);
  }

  private formatSummary(payload: any): string {
    if (typeof payload === "string") {
      return payload;
    }
    if (payload?.artifacts?.summary) {
      return String(payload.artifacts.summary);
    }
    if (payload?.artifacts?.toolResults) {
      return JSON.stringify(payload.artifacts.toolResults, undefined, 2);
    }
    return "Task completed.";
  }

  private deriveAgents(events: GraphEvent[]): AgentRole[] {
    const roles = new Set<AgentRole>(["assistant"]);
    events.forEach((event) => {
      switch (event.stage) {
        case "plan":
          roles.add("planner");
          break;
        case "code_intel":
        case "tool":
        case "sandbox":
          roles.add("coder");
          break;
        case "summary":
          roles.add("reviewer");
          break;
        default:
          break;
      }
    });
    return Array.from(roles);
  }

  private async persist(): Promise<void> {
    await this.context.globalState.update(SESSION_STATE_KEY, this.session);
  }
}
