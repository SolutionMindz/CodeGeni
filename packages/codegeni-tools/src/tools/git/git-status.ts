import { z } from "zod";
import { ToolDefinition } from "../../base";
import { runProcess } from "../../utils/spawn";

const inputSchema = z.object({});

const outputSchema = z.object({
  entries: z.array(
    z.object({
      path: z.string(),
      index: z.string(),
      workingTree: z.string()
    })
  )
});

export const gitStatusTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "git_status",
  description: "Return git porcelain status for the workspace",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(_input, context) {
    const { stdout } = await runProcess(context, {
      args: ["git", "status", "--porcelain", "-z"]
    });

    const entries: Array<{ path: string; index: string; workingTree: string }> = [];
    const records = stdout.split("\u0000").filter(Boolean);
    for (const record of records) {
      const index = record.charAt(0) || "?";
      const workingTree = record.charAt(1) || "?";
      const path = record.slice(3);
      entries.push({ path, index, workingTree });
    }

    return { entries };
  }
};
