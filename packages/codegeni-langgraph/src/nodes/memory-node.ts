import { pushEvent } from "../utils";
import type { GraphContext, GraphNode } from "../types";
import type { ToolContext } from "@codegeni/tools";

export class MemoryNode implements GraphNode {
  readonly name = "memory";

  async run(context: GraphContext): Promise<void> {
    const toolContext: ToolContext = {
      workspaceRoot: context.request.workspaceRoot
    };
    const result = await context.registry.execute("index_workspace", { path: "." }, toolContext);
    context.artifacts.memory = result;
    pushEvent(context, {
      stage: "memory",
      message: "Workspace indexed",
      details: result
    });
  }
}
