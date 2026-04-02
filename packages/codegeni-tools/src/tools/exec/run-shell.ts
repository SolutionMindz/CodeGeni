import { z } from "zod";
import { ToolDefinition } from "../../base";
import { runProcess } from "../../utils/spawn";

const inputSchema = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional()
});

const outputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  durationMs: z.number().nonnegative()
});

export const runShellTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "run_shell",
  description: "Execute a shell command within the workspace boundary",
  permissions: ["execute"],
  streaming: true,
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const result = await runProcess(context, {
      args: ["/bin/sh", "-c", input.command],
      cwd: input.cwd,
      env: input.env,
      timeoutMs: input.timeoutMs ?? 30_000
    });

    return result;
  }
};
