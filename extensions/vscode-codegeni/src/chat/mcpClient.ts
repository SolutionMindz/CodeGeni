import * as vscode from "vscode";

const API_KEY_SECRET = "codegeni.apiKey";

export class McpClient {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async executeTool(toolName: string, input: Record<string, unknown>, workspaceRoot: string): Promise<any> {
    const config = vscode.workspace.getConfiguration("codegeni");
    const mcpUrl = config.get<string>("mcpUrl", "http://localhost:4097");
    const apiKey = await this.context.secrets.get(API_KEY_SECRET);
    const response = await fetch(`${mcpUrl.replace(/\/$/, "")}/tools/${toolName}/execute`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ input, workspaceRoot })
    });

    if (!response.ok) {
      throw new Error(`Tool ${toolName} failed: ${response.status}`);
    }

    const payload = await response.json();
    return payload.result ?? payload;
  }
}
