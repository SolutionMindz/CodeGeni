import * as vscode from "vscode";

export type AgentRole = "user" | "assistant" | "planner" | "coder" | "reviewer" | "system";

export interface GraphEvent {
  stage: string;
  message: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export interface ToolLogEntry {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export interface MemoryHit {
  filePath: string;
  score: number;
  chunk?: string;
}

export interface ChatMessage {
  id: string;
  role: AgentRole;
  content: string;
  createdAt: number;
  status: "pending" | "streaming" | "complete" | "error";
  events?: GraphEvent[];
  toolLogs?: ToolLogEntry[];
  memory?: MemoryHit[];
  diffTargets?: string[];
  agents?: AgentRole[];
}

export interface ChatSessionState {
  messages: ChatMessage[];
  mode: "auto" | "manual";
  pinnedFiles: string[];
  isStreaming: boolean;
  agentFilter?: AgentRole | "all";
}

export interface BrainResponsePayload {
  plan: unknown;
  events: GraphEvent[];
  artifacts: Record<string, unknown>;
}

export interface DiffRequest {
  path?: string;
}

export interface ChatServiceOptions {
  workspaceRoot: vscode.Uri | undefined;
}
