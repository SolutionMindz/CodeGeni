import { pushEvent, nextId } from "../utils";
import type { GraphContext, GraphNode, PlanStep } from "../types";

const DEFAULT_STEPS: Array<Omit<PlanStep, "id">> = [
  {
    description: "Scan the workspace for diagnostics",
    tool: "codegeni_scan",
    params: { path: "." }
  },
  {
    description: "Search for relevant files based on the goal",
    tool: "search_codebase",
    params: { query: "goal" }
  },
  {
    description: "Apply necessary edits via write_file",
    tool: "write_file",
    params: { path: "TODO", content: "" },
    optional: true
  },
  {
    description: "Run the test suite inside the sandbox",
    tool: "test_runner",
    params: { args: [] }
  }
];

export class PlanNode implements GraphNode {
  readonly name = "plan";

  async run(context: GraphContext): Promise<void> {
    const goal = context.request.goal.toLowerCase();
    const hints = context.request.planHints ?? [];
    const plan: PlanStep[] = [];
    DEFAULT_STEPS.forEach((step, idx) => {
      const params = { ...step.params };
      if (params && typeof params === "object" && "query" in params) {
        (params as Record<string, unknown>).query = goal;
      }
      plan.push({ ...step, id: nextId("step", idx), params });
    });

    // Add hint-driven steps
    hints.forEach((hint, index) => {
      plan.push({
        id: nextId("hint", index),
        description: hint,
        tool: "run_shell",
        params: { command: hint },
        optional: true
      });
    });

    context.plan = plan;
    pushEvent(context, {
      stage: "plan",
      message: "Plan synthesized",
      details: { steps: plan.map((step) => step.description) }
    });
  }
}
