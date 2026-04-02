import { createCodegeniToolRegistry } from "@codegeni/tools";
import { CodegeniLangGraph, TaskRequest, TaskRequestSchema, type GraphResult } from "@codegeni/langgraph";

export interface BrainOptions {
  workspaceRoot?: string;
}

export class CodegeniBrain {
  private readonly registry = createCodegeniToolRegistry();
  private readonly graph = new CodegeniLangGraph(this.registry);
  private readonly defaultWorkspace?: string;

  constructor(options: BrainOptions = {}) {
    this.defaultWorkspace = options.workspaceRoot;
  }

  async handleTask(input: Omit<TaskRequest, "workspaceRoot"> & Partial<TaskRequest>): Promise<GraphResult> {
    const workspaceRoot = input.workspaceRoot ?? this.defaultWorkspace;
    if (!workspaceRoot) {
      throw new Error("workspaceRoot must be provided either in the request or constructor");
    }
    const request = TaskRequestSchema.parse({ ...input, workspaceRoot });
    return this.graph.runTask(request);
  }
}
