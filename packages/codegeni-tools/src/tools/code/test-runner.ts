import { z } from "zod";
import { DockerSandboxRunner, SandboxError } from "@codegeni/sandbox";
import { ToolDefinition, ToolError } from "../../base";

const sandboxRunner = new DockerSandboxRunner();

const inputSchema = z.object({
  args: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  env: z.record(z.string()).optional()
});

const outputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative()
});

export const testRunnerTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "test_runner",
  description: "Execute the Python test suite inside an isolated sandbox",
  permissions: ["execute"],
  streaming: true,
  inputSchema,
  outputSchema,
  async execute(input, context) {
    try {
      const result = await sandboxRunner.run({
        workspacePath: context.workspaceRoot,
        cmd: ["pytest", ...input.args],
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
