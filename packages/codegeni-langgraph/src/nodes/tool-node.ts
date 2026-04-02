import type { GraphContext, GraphNode } from "../types";
import { pushEvent } from "../utils";
import type { ToolContext } from "@codegeni/tools";

export class ToolExecutionNode implements GraphNode {
  readonly name = "tool";

  async run(context: GraphContext): Promise<void> {
    const toolContext: ToolContext = { workspaceRoot: context.request.workspaceRoot };
    const toolResults: Record<string, unknown>[] = [];

    for (const step of context.plan) {
      if (step.tool === "write_file" && step.params["path"] === "TODO") {
        pushEvent(context, {
          stage: "tool",
          message: `Skipping ${step.tool} because parameters are placeholders`,
          details: { stepId: step.id }
        });
        continue;
      }
      try {
        const result = await context.registry.execute(step.tool, step.params, toolContext);
        toolResults.push({ id: step.id, tool: step.tool, result });
        context.executedTools.push(step.tool);
        pushEvent(context, {
          stage: "tool",
          message: `${step.tool} executed`,
          details: { stepId: step.id }
        });
      } catch (error) {
        pushEvent(context, {
          stage: "error",
          message: `${step.tool} failed`,
          details: { stepId: step.id, error: (error as Error).message }
        });
        if (!step.optional) {
          throw error;
        }
      }
    }

    context.artifacts.toolResults = toolResults;
  }
}
