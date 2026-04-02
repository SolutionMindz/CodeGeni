import { expect, test } from "@playwright/test";
import { createFixtureWorkspace } from "./helpers/workspace";

const brainBaseUrl = process.env.CODEGENI_BRAIN_BASE_URL;

test.describe("CodeGeni Brain API", () => {
  test.skip(!brainBaseUrl, "Set CODEGENI_BRAIN_BASE_URL to run the reasoning brain suite.");

  test("GET /health responds with ok", async ({ request }) => {
    const response = await request.get(`${brainBaseUrl}/health`);
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body).toEqual({ status: "ok" });
  });

  test("POST /tasks produces a LangGraph plan and events", async ({ request }, testInfo) => {
    const workspaceRoot = await createFixtureWorkspace(testInfo);

    const response = await request.post(`${brainBaseUrl}/tasks`, {
      data: {
        goal: "inspect fibonacci implementation",
        workspaceRoot
      }
    });
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.plan.length).toBeGreaterThan(0);
    expect(body.events.map((event: { stage: string }) => event.stage)).toEqual(
      expect.arrayContaining(["plan", "memory", "code_intel", "tool", "summary"])
    );
    expect(Object.keys(body.artifacts).length).toBeGreaterThan(0);
  });
});
