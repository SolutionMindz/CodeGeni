import { z } from "zod";
import { ToolDefinition, ToolError } from "../../base";
import { runProcess } from "../../utils/spawn";

const inputSchema = z.object({
  message: z.string().min(1),
  paths: z.array(z.string().min(1)).optional(),
  allowEmpty: z.boolean().default(false)
});

const outputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  commitCreated: z.boolean()
});

export const gitCommitTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "git_commit",
  description: "Create a git commit with optional file subset",
  permissions: ["git_write"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const addArgs = ["git", "add"]; 
    if (input.paths && input.paths.length > 0) {
      addArgs.push(...input.paths);
    } else {
      addArgs.push("--all");
    }
    await runProcess(context, { args: addArgs });

    const commitArgs = ["git", "commit", "-m", input.message];
    if (input.allowEmpty) {
      commitArgs.push("--allow-empty");
    }

    const { stdout, stderr, exitCode } = await runProcess(context, { args: commitArgs });

    if (exitCode !== 0) {
      throw new ToolError("GIT_COMMIT_FAILED", stderr || stdout || "git commit failed", 500);
    }

    return { stdout, stderr, commitCreated: true };
  }
};
