import type { ToolRegistry } from "@codegeni/tools";
import { PlanNode } from "./nodes/plan-node";
import { MemoryNode } from "./nodes/memory-node";
import { CodeIntelNode } from "./nodes/codeintel-node";
import { ToolExecutionNode } from "./nodes/tool-node";
import { SandboxNode } from "./nodes/sandbox-node";
import type { GraphNode, GraphResult, TaskRequest } from "./types";
import { TaskRequestSchema } from "./types";
import { pushEvent } from "./utils";

export class CodegeniLangGraph {
  private readonly nodes: GraphNode[];

  constructor(private readonly registry: ToolRegistry, nodes?: GraphNode[]) {
    this.nodes = nodes ?? [
      new PlanNode(),
      new MemoryNode(),
      new CodeIntelNode(),
      new ToolExecutionNode(),
      new SandboxNode()
    ];
  }

  async runTask(request: TaskRequest): Promise<GraphResult> {
    const parsed = TaskRequestSchema.parse(request);
    const context = {
      request: parsed,
      registry: this.registry,
      plan: [],
      executedTools: [],
      artifacts: {},
      events: []
    };

    for (const node of this.nodes) {
      await node.run(context);
    }

    pushEvent(context, {
      stage: "summary",
      message: "LangGraph run completed",
      details: {
        executedTools: context.executedTools,
        artifacts: Object.keys(context.artifacts)
      }
    });

    return {
      plan: context.plan,
      events: context.events,
      artifacts: context.artifacts
    };
  }
}
