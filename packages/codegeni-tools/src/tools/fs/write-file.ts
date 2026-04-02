import { z } from "zod";
import { ToolDefinition } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";
import { atomicWrite } from "../../utils/fs";

const inputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  encoding: z.literal("utf-8").default("utf-8"),
  createParents: z.boolean().default(true)
});

const outputSchema = z.object({
  path: z.string(),
  bytesWritten: z.number(),
  encoding: z.literal("utf-8")
});

export const writeFileTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "write_file",
  description: "Write text content to a workspace file atomically",
  permissions: ["write_fs"],
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const targetPath = resolveWorkspacePath(context.workspaceRoot, input.path);
    await atomicWrite(targetPath, input.content, input.encoding);
    return {
      path: input.path,
      bytesWritten: Buffer.byteLength(input.content, input.encoding),
      encoding: "utf-8"
    };
  }
};
