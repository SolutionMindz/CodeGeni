import * as assert from "assert";
import * as vscode from "vscode";
import { ChatService } from "../../chat/chatService";

declare const global: typeof globalThis & { fetch: typeof fetch };

suite("ChatService", () => {
  let service: ChatService;
  const messages: string[] = [];

  setup(async () => {
    const context = createMockContext();
    service = new ChatService(context as unknown as vscode.ExtensionContext);
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          summary: "done",
          events: [{ stage: "plan", message: "ok" }],
          artifacts: { toolResults: [], memoryHits: [] }
        }),
        { headers: { "content-type": "application/json" } }
      );
    service.onDidChangeSession((state) => messages.push(`messages:${state.messages.length}`));
  });

  test("queues user and assistant messages", async () => {
    await service.sendMessage("test", { workspaceRoot: vscode.Uri.file(process.cwd()) });
    const state = service.getState();
    assert.strictEqual(state.messages.length, 2);
    assert.strictEqual(state.messages[0].role, "user");
    assert.strictEqual(state.messages[1].role, "assistant");
    assert.ok(messages.length >= 1);
  });

  test("derives agent roles from events", async () => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          summary: "done",
          events: [
            { stage: "plan", message: "planning" },
            { stage: "tool", message: "running tool" },
            { stage: "summary", message: "finished" }
          ],
          artifacts: { toolResults: [], memoryHits: [] }
        }),
        { headers: { "content-type": "application/json" } }
      );
    await service.sendMessage("agents", { workspaceRoot: vscode.Uri.file(process.cwd()) });
    const assistant = service.getState().messages.find((msg) => msg.role === "assistant");
    assert.ok(assistant);
    assert.ok(assistant?.agents?.includes("planner"));
    assert.ok(assistant?.agents?.includes("coder"));
    assert.ok(assistant?.agents?.includes("reviewer"));
  });
});

function createMockContext(): Partial<vscode.ExtensionContext> {
  const store = new Map<string, any>();
  return {
    globalState: {
      get: (key: string, defaultValue?: any) => store.get(key) ?? defaultValue,
      update: async (key: string, value: any) => {
        store.set(key, value);
      }
    } as unknown as vscode.Memento,
    secrets: {
      store: async () => undefined,
      get: async () => undefined,
      delete: async () => undefined
    } as unknown as vscode.SecretStorage
  };
}
