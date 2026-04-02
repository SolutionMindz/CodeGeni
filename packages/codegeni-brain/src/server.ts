import { CodegeniBrain } from "./brain";
import { TaskRequestSchema } from "@codegeni/langgraph";

const brain = new CodegeniBrain({ workspaceRoot: process.env.CODEGENI_WORKSPACE ?? process.cwd() });
const port = Number(process.env.CODEGENI_BRAIN_PORT ?? 4100);

Bun.serve({
  port,
  fetch: async (request) => {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "POST" && url.pathname === "/tasks") {
      try {
        const payload = await request.json();
        const parsed = TaskRequestSchema.partial({ workspaceRoot: true }).parse(payload);
        const result = await brain.handleTask(parsed);
        return json(result);
      } catch (error) {
        const status = error instanceof Error ? 400 : 500;
        return json({ error: (error as Error).message }, status);
      }
    }

    return json({ error: "Not found" }, 404);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

console.log(`CodeGeni Brain listening on http://localhost:${port}`);
