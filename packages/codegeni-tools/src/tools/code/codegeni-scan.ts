import { z } from "zod";
import { ToolDefinition, ToolError } from "../../base";
import { resolveWorkspacePath } from "../../utils/path";
import { runProcess } from "../../utils/spawn";

const diagnosticSchema = z.object({
  ruleId: z.string(),
  message: z.string(),
  severity: z.string(),
  path: z.string(),
  line: z.number().int().optional(),
  column: z.number().int().optional(),
  endLine: z.number().int().optional(),
  endColumn: z.number().int().optional(),
  suggestions: z.array(z.string()).optional(),
  source: z.string().optional()
});

const inputSchema = z.object({
  path: z.string().default("."),
  config: z.string().optional(),
  format: z.enum(["json", "ndjson", "text"]).default("json"),
  extraArgs: z.array(z.string()).optional()
});

const outputSchema = z.object({
  diagnostics: z.array(diagnosticSchema),
  rawOutput: z.string()
});

export const codegeniScanTool: ToolDefinition<typeof inputSchema, typeof outputSchema> = {
  name: "codegeni_scan",
  description: "Run the CodeGeni Python CLI and return diagnostics",
  permissions: ["read_only"],
  streaming: true,
  inputSchema,
  outputSchema,
  async execute(input, context) {
    const workspacePath = resolveWorkspacePath(context.workspaceRoot, input.path);
    const args = [
      "python3",
      "-m",
      "codegeni",
      "scan",
      workspacePath,
      "--format",
      input.format
    ];
    if (input.config) {
      const configPath = resolveWorkspacePath(context.workspaceRoot, input.config);
      args.push("--config", configPath);
    }
    if (input.extraArgs) {
      args.push(...input.extraArgs);
    }

    const result = await runProcess(context, { args });

    if (result.exitCode !== 0 && !result.stdout.trim()) {
      throw new ToolError("CODEGENI_SCAN_FAILED", result.stderr || "codegeni scan failed", 500);
    }

    let diagnostics: unknown = [];
    if (input.format === "json") {
      try {
        diagnostics = JSON.parse(result.stdout || "[]");
      } catch (err) {
        throw new ToolError(
          "JSON_PARSE_ERROR",
          `Unable to parse CodeGeni scan output: ${(err as Error).message}`,
          500
        );
      }
    }

    return {
      diagnostics: diagnosticSchema.array().parse(diagnostics),
      rawOutput: result.stdout
    };
  }
};
