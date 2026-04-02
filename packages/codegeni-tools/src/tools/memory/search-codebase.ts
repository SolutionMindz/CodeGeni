import { z } from "zod";
import { CodegeniMemoryStore, searchCodebase } from "@codegeni/memory";
import { ToolDefinition } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";

const store = new CodegeniMemoryStore({
  baseUrl: process.env.CHROMADB_URL
});

const inputSchema = z.object({
  path: z.string().default("."),
  query: z.string().min(2),
  topK: z.number().int().min(1).max(25).default(8),
  minScore: z.number().min(0).max(1).default(0.35)
});

const outputSchema = z.object({
  results: z.array(
    z.object({
      score: z.number(),
      chunk: z.object({
        id: z.string(),
        filePath: z.string(),
        language: z.string(),
        startLine: z.number().int(),
        endLine: z.number().int(),
        chunkType: z.string(),
        symbolName: z.string().optional(),
        symbolKind: z.string().optional(),
        indexedAt: z.string().optional(),
        fileMtimeMs: z.number().optional()
      }),
      document: z.string()
    })
  )
});

export const searchCodebaseTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "search_codebase",
  description: "Semantic search over indexed workspace chunks",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const targetPath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const results = await searchCodebase({
      store,
      workspaceRoot: targetPath,
      query: input.query,
      topK: input.topK,
      minScore: input.minScore
    });

    return { results };
  }
};
