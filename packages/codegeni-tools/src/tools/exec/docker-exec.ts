import { DockerSandboxRunner, SandboxError } from "@codegeni/sandbox";
import { z } from "zod";
import { ToolDefinition, ToolError } from "../../base";

const runner = new DockerSandboxRunner();

const inputSchema = z.object({
  cmd: z.array(z.string()).min(1),
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  env: z.record(z.string()).optional()
});

const outputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative()
});

export const dockerExecTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "docker_exec",
  description: "Run arbitrary commands within the CodeGeni sandbox container",
  permissions: ["execute"],
  streaming: true,
  inputSchema,
  outputSchema,
  async execute(input, context) {
    try {
      const result = await runner.run({
        workspacePath: context.workspaceRoot,
        cmd: input.cmd,
        timeoutSec: input.timeoutMs ? Math.ceil(input.timeoutMs / 1000) : undefined,
        env: input.env
      });
      return result;
    } catch (error) {
      if (error instanceof SandboxError) {
        throw new ToolError(error.code, error.message, 500);
      }
      throw error;
    }
  }
};
