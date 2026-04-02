import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { createFixtureWorkspace } from "./helpers/workspace";

const liveBaseUrl = process.env.CODEGENI_E2E_BASE_URL;
const expectedCoreTools = [
  "read_file",
  "write_file",
  "list_directory",
  "search_files",
  "run_shell",
  "git_status",
  "git_diff",
  "git_commit",
  "codegeni_scan",
  "test_runner",
  "index_workspace",
  "search_codebase",
  "find_symbol",
  "docker_exec"
] as const;

async function executeTool<TInput, TResult = any>(
  request: APIRequestContext,
  toolName: string,
  workspaceRoot: string,
  input: TInput
): Promise<{
  response: APIResponse;
  body: TResult;
}> {
  const response = await request.post(`/tools/${toolName}/execute`, {
    data: {
      workspaceRoot,
      input
    }
  });
  const body = await response.json();
  return { response, body };
}

test.describe("CodeGeni MCP HTTP contract", () => {
  test.skip(!liveBaseUrl, "Set CODEGENI_E2E_BASE_URL to run the MCP contract suite against a live server.");

  test("GET /health returns an ok payload", async ({ request }) => {
    const response = await request.get("/health");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body).toEqual({ status: "ok" });
  });

  test("GET /tools advertises the core tool registry", async ({ request }) => {
    const response = await request.get("/tools");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(Array.isArray(body.tools)).toBeTruthy();

    const toolNames = body.tools.map((tool: { name: string }) => tool.name);
    expect(toolNames).toEqual(expect.arrayContaining([...expectedCoreTools]));

    for (const tool of body.tools) {
      expect(tool).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          permissions: expect.any(Array),
          streaming: expect.any(Boolean)
        })
      );
    }
  });

  test("POST /tools/:name/execute returns a structured 404 for unknown tools", async ({ request }) => {
    const response = await request.post("/tools/does_not_exist/execute", {
      data: {
        input: {},
        workspaceRoot: process.cwd()
      }
    });
    const body = await response.json();

    expect(response.status()).toBe(404);
    expect(body).toEqual(
      expect.objectContaining({
        code: "TOOL_NOT_FOUND",
        error: expect.any(String)
      })
    );
  });

  test("POST /tools/:name/execute validates the request envelope", async ({ request }) => {
    const response = await request.post("/tools/read_file/execute", {
      data: {
        workspaceRoot: 123
      }
    });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toEqual(
      expect.objectContaining({
        code: "INVALID_REQUEST",
        error: expect.any(String)
      })
    );
  });
});

test.describe("Tool behavior", () => {
  test.skip(!liveBaseUrl, "Set CODEGENI_E2E_BASE_URL to run the MCP contract suite against a live server.");

  test("read_file returns file content for a workspace-relative path", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    const { response, body } = await executeTool(request, "read_file", workspaceRoot, { path: "README.md" });

    expect(response.ok()).toBeTruthy();
    expect(body.result).toEqual(
      expect.objectContaining({
        path: "README.md",
        content: expect.stringContaining("# Fixture Workspace")
      })
    );
  });

  test("write_file persists content that read_file can fetch back", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);

    const write = await executeTool(request, "write_file", workspaceRoot, {
      path: "notes/todo.txt",
      content: "ship phase one"
    });
    expect(write.response.ok()).toBeTruthy();

    const read = await executeTool(request, "read_file", workspaceRoot, { path: "notes/todo.txt" });
    expect(read.response.ok()).toBeTruthy();
    expect(read.body.result).toEqual(
      expect.objectContaining({
        path: "notes/todo.txt",
        content: "ship phase one"
      })
    );
  });

  test("file tools reject paths that escape the workspace root", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    const { response, body } = await executeTool(request, "read_file", workspaceRoot, { path: "../outside.txt" });

    expect(response.status()).toBe(403);
    expect(body).toEqual(
      expect.objectContaining({
        code: "PATH_OUTSIDE_WORKSPACE",
        error: expect.any(String)
      })
    );
  });

  test("list_directory returns entry metadata for a fixture workspace", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    const { response, body } = await executeTool(request, "list_directory", workspaceRoot, { path: "." });

    expect(response.ok()).toBeTruthy();
    expect(body.result.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "README.md"
        }),
        expect.objectContaining({
          name: "src"
        })
      ])
    );
  });

  test("index_workspace provides embedding stats for the fixture", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    const { response, body } = await executeTool(request, "index_workspace", workspaceRoot, { path: "." });

    expect(response.ok()).toBeTruthy();
    expect(body.result).toEqual(
      expect.objectContaining({
        workspaceId: expect.any(String),
        filesProcessed: expect.any(Number),
        chunksIndexed: expect.any(Number)
      })
    );
  });

  test("search_codebase returns semantic matches after indexing", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    await executeTool(request, "index_workspace", workspaceRoot, { path: "." });
    const { response, body } = await executeTool(request, "search_codebase", workspaceRoot, {
      path: ".",
      query: "fibonacci",
      topK: 3
    });

    expect(response.ok()).toBeTruthy();
    expect(body.result.results.length).toBeGreaterThan(0);
  });

  test("find_symbol surfaces functions inside the workspace", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    const { response, body } = await executeTool(request, "find_symbol", workspaceRoot, {
      path: ".",
      file: "src/math_utils.py",
      query: "fibonacci",
      maxResults: 5
    });

    expect(response.ok()).toBeTruthy();
    expect(body.result.hits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: expect.stringContaining("math_utils.py"),
          symbolName: expect.stringContaining("fibonacci")
        })
      ])
    );
  });

  test.fixme("docker_exec runs commands inside the sandbox image", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);
    const { response, body } = await executeTool(request, "docker_exec", workspaceRoot, {
      cmd: ["python3", "-c", "print('hello from sandbox')"]
    });

    expect(response.ok()).toBeTruthy();
    expect(body.result.exitCode).toBe(0);
  });
});
