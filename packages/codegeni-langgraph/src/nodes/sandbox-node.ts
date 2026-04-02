import type { GraphContext, GraphNode } from "../types";
import { pushEvent } from "../utils";
import type { ToolContext } from "@codegeni/tools";

export class SandboxNode implements GraphNode {
  readonly name = "sandbox";

  async run(context: GraphContext): Promise<void> {
    if (context.executedTools.includes("test_runner")) {
      pushEvent(context, {
        stage: "sandbox",
        message: "Tests already executed via plan"
      });
      return;
    }

    const toolContext: ToolContext = { workspaceRoot: context.request.workspaceRoot };
    const result = await context.registry.execute(
      "docker_exec",
      { cmd: ["pytest"], timeoutMs: 120_000 },
      toolContext
    );
    context.executedTools.push("docker_exec");
    context.artifacts.sandbox = result;
    pushEvent(context, {
      stage: "sandbox",
      message: "docker_exec completed",
      details: { exitCode: result.exitCode }
    });
  }
}
