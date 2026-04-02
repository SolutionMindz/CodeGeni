import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { z } from "zod";
import { ToolDefinition } from "../../base";

const inputSchema = z.object({
  pattern: z.string().min(1),
  contentRegex: z.string().optional(),
  maxResults: z.number().int().min(1).max(500).default(50)
});

const outputSchema = z.object({
  matches: z.array(
    z.object({
      path: z.string(),
      preview: z.string().optional()
    })
  )
});

export const searchFilesTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "search_files",
  description: "Search workspace files using glob patterns and optional regex",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const entries = await fg(input.pattern, {
      cwd: context.workspaceRoot,
      dot: false,
      onlyFiles: true
    });

    const regex = input.contentRegex ? new RegExp(input.contentRegex, "i") : null;
    const matches = [] as { path: string; preview?: string }[];

    for (const relativePath of entries) {
      if (matches.length >= input.maxResults) {
        break;
      }
      if (!regex) {
        matches.push({ path: relativePath });
        continue;
      }

      const absolute = path.join(context.workspaceRoot, relativePath);
      const content = await fs.readFile(absolute, "utf-8");
      const match = content.match(regex);
      if (match) {
        const start = Math.max(match.index! - 40, 0);
        const end = Math.min(match.index! + 40, content.length);
        const preview = content.slice(start, end).replace(/\s+/g, " ");
        matches.push({ path: relativePath, preview });
      }
    }

    return { matches };
  }
};
