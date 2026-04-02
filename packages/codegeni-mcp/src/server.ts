import { createCodegeniToolRegistry, ToolContext, ToolError } from "@codegeni/tools";
import { z } from "zod";

const registry = createCodegeniToolRegistry();

const executeBodySchema = z.object({
  input: z.unknown().optional(),
  workspaceRoot: z.string().optional(),
  env: z.record(z.string()).optional()
});

interface ServerOptions {
  workspaceRoot: string;
  port?: number;
}

export function startCodegeniMcpServer(options: ServerOptions) {
  const port = options.port ?? Number(process.env.CODEGENI_MCP_PORT ?? 4097);
  const server = Bun.serve({
    port,
    fetch: (req) => handleRequest(req, options.workspaceRoot)
  });
  console.log(`CodeGeni MCP server ready on http://localhost:${server.port}`);
  return server;
}

async function handleRequest(request: Request, defaultWorkspace: string): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return jsonResponse({ status: "ok" });
  }

  if (request.method === "GET" && url.pathname === "/tools") {
    const tools = registry.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      permissions: tool.permissions,
      streaming: tool.streaming ?? false,
      timeoutMs: tool.timeoutMs ?? null
    }));
    return jsonResponse({ tools });
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (request.method === "POST" && segments.length === 3 && segments[0] === "tools" && segments[2] === "execute") {
    const toolName = segments[1];
    try {
      const body = executeBodySchema.parse(await request.json());
      const workspaceRoot = body.workspaceRoot ?? defaultWorkspace;
      const context: ToolContext = {
        workspaceRoot,
        env: body.env
      };
      const result = await registry.execute(toolName, body.input ?? {}, context);
      return jsonResponse({ result });
    } catch (error) {
      if (error instanceof ToolError) {
        return jsonResponse({ error: error.message, code: error.code }, error.status);
      }
      if (error instanceof z.ZodError) {
        return jsonResponse({ error: error.message, code: "INVALID_REQUEST" }, 400);
      }
      console.error(`tool execution failed: ${toolName}`, error);
      return jsonResponse({ error: "Internal error", code: "INTERNAL_ERROR" }, 500);
    }
  }

  return jsonResponse({ error: "Not found" }, 404);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

if (import.meta.main) {
  const workspaceRoot = process.env.CODEGENI_WORKSPACE ?? process.cwd();
  startCodegeniMcpServer({ workspaceRoot });
}
