import fs from "node:fs/promises";
import { z } from "zod";
import { ToolDefinition } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";

const inputSchema = z.object({
  path: z.string().min(1),
  encoding: z.literal("utf-8").optional()
});

const outputSchema = z.object({
  path: z.string(),
  content: z.string(),
  size: z.number().nonnegative(),
  encoding: z.literal("utf-8")
});

export const readFileTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "read_file",
  description: "Read a UTF-8 text file from the workspace",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const targetPath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const content = await fs.readFile(targetPath, "utf-8");
    const stats = await fs.stat(targetPath);
    return {
      path: input.path,
      content,
      size: stats.size,
      encoding: "utf-8"
    };
  }
};
