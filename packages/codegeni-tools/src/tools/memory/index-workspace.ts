import { z } from "zod";
import { CodegeniMemoryStore, indexWorkspace } from "@codegeni/memory";
import { ToolDefinition } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";

const store = new CodegeniMemoryStore({
  baseUrl: process.env.CHROMADB_URL
});

const inputSchema = z.object({
  path: z.string().default("."),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  maxFileSizeBytes: z.number().int().positive().optional(),
  chunkSizeLines: z.number().int().positive().optional(),
  chunkOverlapLines: z.number().int().positive().optional()
});

const outputSchema = z.object({
  workspaceId: z.string(),
  filesProcessed: z.number().int().nonnegative(),
  chunksIndexed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative()
});

export const indexWorkspaceTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "index_workspace",
  description: "Walk the workspace, embed files, and upsert semantic chunks into memory",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const targetPath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const stats = await indexWorkspace({
      workspaceRoot: targetPath,
      store,
      include: input.include,
      exclude: input.exclude,
      maxFileSizeBytes: input.maxFileSizeBytes,
      chunkSizeLines: input.chunkSizeLines,
      chunkOverlapLines: input.chunkOverlapLines
    });

    return stats;
  }
};
