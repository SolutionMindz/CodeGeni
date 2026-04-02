import { z } from "zod";
import { ToolDefinition } from "../../base";
import { runProcess } from "../../utils/spawn";

const inputSchema = z.object({
  path: z.string().optional(),
  staged: z.boolean().default(false)
});

const outputSchema = z.object({
  diff: z.string()
});

export const gitDiffTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "git_diff",
  description: "Show git diff for the workspace or a specific file",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const args = ["git", "diff"];
    if (input.staged) {
      args.push("--staged");
    }
    if (input.path) {
      args.push("--", input.path);
    }

    const { stdout } = await runProcess(context, { args });
    return { diff: stdout };
  }
};
