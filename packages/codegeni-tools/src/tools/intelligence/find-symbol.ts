import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { findSymbols } from "@codegeni/intelligence";
import { ToolDefinition } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python"
};

const inputSchema = z.object({
  path: z.string().default("."),
  file: z.string().min(1),
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(25).default(10)
});

const outputSchema = z.object({
  hits: z.array(
    z.object({
      filePath: z.string(),
      symbolName: z.string().optional(),
      symbolKind: z.string().optional(),
      startLine: z.number().int(),
      endLine: z.number().int(),
      snippet: z.string(),
      score: z.number()
    })
  )
});

export const findSymbolTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "find_symbol",
  description: "Search for functions or classes in a file using AST-aware symbol detection",
  permissions: ["read_only"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const basePath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const absoluteFile = resolveWorkspacePath(basePath, input.file);
    const ext = path.extname(absoluteFile).toLowerCase();
    const language = LANGUAGE_BY_EXT[ext];
    if (!language) {
      return { hits: [] };
    }
    const content = await fs.readFile(absoluteFile, "utf-8");
    const hits = findSymbols({
      content,
      filePath: path.relative(context.workspaceRoot, absoluteFile) || input.file,
      language,
      query: input.query,
      maxResults: input.maxResults
    });
    return { hits };
  }
};
