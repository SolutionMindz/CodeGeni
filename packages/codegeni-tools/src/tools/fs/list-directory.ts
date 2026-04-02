import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { ToolDefinition } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";

const inputSchema = z.object({
  path: z.string().default("."),
  includeHidden: z.boolean().default(false)
});

const entrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number().nonnegative(),
  modifiedAt: z.string()
});

const outputSchema = z.object({
  entries: z.array(entrySchema)
});

export const listDirectoryTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "list_directory",
  description: "List files and folders under a workspace relative path",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const targetPath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const dirents = await fs.readdir(targetPath, { withFileTypes: true });
    const entries = await Promise.all(
      dirents
        .filter((entry) => input.includeHidden || !entry.name.startsWith("."))
        .map(async (entry) => {
          const absolute = path.join(targetPath, entry.name);
          const stats = await fs.stat(absolute);
          return {
            name: entry.name,
            path: path.relative(context.workspaceRoot, absolute) || ".",
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modifiedAt: stats.mtime.toISOString()
          };
        })
    );
    return { entries };
  }
};
