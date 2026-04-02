import type { GraphContext, GraphNode } from "../types";
import { pushEvent } from "../utils";
import type { ToolContext } from "@codegeni/tools";

export class CodeIntelNode implements GraphNode {
  readonly name = "code_intel";

  async run(context: GraphContext): Promise<void> {
    const toolContext: ToolContext = { workspaceRoot: context.request.workspaceRoot };
    const result = await context.registry.execute(
      "search_codebase",
      { path: ".", query: context.request.goal, topK: 5 },
      toolContext
    );
    context.artifacts.codeIntel = result;
    pushEvent(context, {
      stage: "code_intel",
      message: "Semantic search completed",
      details: { matches: result.results?.length ?? 0 }
    });
  }
}
