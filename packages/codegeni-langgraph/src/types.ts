import { z } from "zod";
import type { ToolRegistry } from "@codegeni/tools";

export const TaskRequestSchema = z.object({
  goal: z.string().min(4),
  workspaceRoot: z.string().min(1),
  planHints: z.array(z.string()).optional()
});

export type TaskRequest = z.infer<typeof TaskRequestSchema>;

export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  optional?: boolean;
}

export interface GraphEvent {
  timestamp: string;
  stage:
    | "plan"
    | "memory"
    | "code_intel"
    | "tool"
    | "sandbox"
    | "summary"
    | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface GraphContext {
  request: TaskRequest;
  registry: ToolRegistry;
  plan: PlanStep[];
  executedTools: string[];
  artifacts: Record<string, unknown>;
  events: GraphEvent[];
}

export interface GraphNode {
  name: string;
  run(context: GraphContext): Promise<void>;
}

export interface GraphResult {
  plan: PlanStep[];
  events: GraphEvent[];
  artifacts: Record<string, unknown>;
}
