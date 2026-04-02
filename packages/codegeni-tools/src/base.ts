import { z } from "zod";

export type ToolPermission = "read_only" | "write_fs" | "execute" | "git_write";

export interface ToolContext {
  workspaceRoot: string;
  env?: Record<string, string>;
  tempDir?: string;
  logger?: (event: ToolLogEvent) => void;
}

export interface ToolLogEvent {
  tool: string;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolDefinition<
  TInput extends z.ZodTypeAny,
  TOutput extends z.ZodTypeAny
> {
  name: string;
  description: string;
  permissions: ToolPermission[];
  streaming?: boolean;
  timeoutMs?: number;
  inputSchema: TInput;
  outputSchema: TOutput;
  execute(
    input: z.infer<TInput>,
    context: ToolContext
  ): Promise<z.infer<TOutput>>;
}

export class ToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<z.ZodTypeAny, z.ZodTypeAny>>();

  register(tool: ToolDefinition<z.ZodTypeAny, z.ZodTypeAny>): void {
    if (this.tools.has(tool.name)) {
      throw new ToolError("DUPLICATE_TOOL", `${tool.name} already registered`, 409);
    }
    this.tools.set(tool.name, tool);
  }

  list(): ToolDefinition<z.ZodTypeAny, z.ZodTypeAny>[] {
    return Array.from(this.tools.values());
  }

  get(name: string): ToolDefinition<z.ZodTypeAny, z.ZodTypeAny> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolError("TOOL_NOT_FOUND", `${name} is not registered`, 404);
    }
    return tool;
  }

  async execute<TInput extends z.ZodTypeAny, TOutput extends z.ZodTypeAny>(
    name: string,
    input: unknown,
    context: ToolContext
  ): Promise<z.infer<TOutput>> {
    const tool = this.get(name) as ToolDefinition<TInput, TOutput>;
    const parsedInput = await tool.inputSchema.parseAsync(input);
    const result = await tool.execute(parsedInput, context);
    return tool.outputSchema.parseAsync(result);
  }
}
