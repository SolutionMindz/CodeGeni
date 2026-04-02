import * as vscode from "vscode";
import { ChatService } from "./chatService";
import { ChatSessionState } from "./types";

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = "codegeniChat";
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly chatService: ChatService
  ) {
    this.chatService.onDidChangeSession((state) => {
      this.postState(state);
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => this.onMessage(message));
    this.postState(this.chatService.getState());
  }

  reveal(): void {
    this.view?.show?.(true);
  }

  private postState(state: ChatSessionState): void {
    if (!this.view) {
      return;
    }
    this.view.webview.postMessage({ type: "session:update", payload: state }).catch(() => undefined);
  }

  private async onMessage(message: any) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    switch (message?.type) {
      case "chat:ready": {
        this.postState(this.chatService.getState());
        break;
      }
      case "chat:send": {
        await this.chatService.sendMessage(String(message.text ?? ""), { workspaceRoot });
        break;
      }
      case "chat:cancel": {
        this.chatService.cancel();
        break;
      }
      case "chat:mode": {
        if (message.mode === "auto" || message.mode === "manual") {
          await this.chatService.setMode(message.mode);
          vscode.workspace.getConfiguration("codegeni").update("chat.mode", message.mode, vscode.ConfigurationTarget.Global);
        }
        break;
      }
      case "chat:openDiff": {
        if (typeof message.path === "string") {
          await vscode.commands.executeCommand("codegeni.chat.showDiff", message.path);
        }
        break;
      }
      case "chat:openFile": {
        if (typeof message.path === "string") {
          await this.openFile(message.path);
        }
        break;
      }
      case "chat:storeToken": {
        if (typeof message.token === "string") {
          await this.chatService.storeApiKey(message.token);
          vscode.window.showInformationMessage("CodeGeni: API token stored.");
        }
        break;
      }
      case "chat:logout": {
        await this.chatService.clearApiKey();
        vscode.window.showInformationMessage("CodeGeni: API token cleared.");
        break;
      }
      case "chat:agentFilter": {
        if (message.agent === "planner" || message.agent === "coder" || message.agent === "reviewer" || message.agent === "all") {
          await this.chatService.setAgentFilter(message.agent);
        }
        break;
      }
      default:
        break;
    }
  }

  private async openFile(relativePath: string) {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      return;
    }
    const target = vscode.Uri.joinPath(workspace.uri, relativePath);
    const doc = await vscode.workspace.openTextDocument(target);
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  private renderHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", "chatPanel.js"));
    const nonce = String(Math.random()).replace(/\W/g, "");
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${webview.cspSource};" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CodeGeni Chat</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      margin: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem 1rem;
    }
    .message {
      margin-bottom: 0.75rem;
      border-radius: 6px;
      padding: 0.5rem;
      background: var(--vscode-editorWidget-background);
      border: 1px solid var(--vscode-editorWidget-border);
    }
    .message.user {
      background: var(--vscode-editor-selectionHighlightBackground);
    }
    .message .meta {
      font-size: 0.75rem;
      opacity: 0.8;
      margin-bottom: 0.25rem;
    }
    #controls {
      padding: 0.75rem;
      border-top: 1px solid var(--vscode-panel-border);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    #inputRow {
      display: flex;
      gap: 0.5rem;
    }
    #inputRow textarea {
      flex: 1;
      min-height: 60px;
    }
    #timeline,
    #toolLogs,
    #contextPanel {
      border-top: 1px solid var(--vscode-panel-border);
      padding: 0.5rem 1rem;
      max-height: 160px;
      overflow-y: auto;
    }
    #memoryChart {
      width: 100%;
      height: 100px;
      margin-bottom: 0.5rem;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
    }
    #agentFilters {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .chip {
      border-radius: 999px;
      border: 1px solid var(--vscode-editorWidget-border);
      padding: 2px 8px;
      background: transparent;
      cursor: pointer;
    }
    .chip.selected {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    h3 {
      margin: 0.5rem 0;
      font-size: 0.9rem;
    }
    .tag {
      display: inline-block;
      padding: 0 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-right: 0.25rem;
    }
  </style>
</head>
<body>
  <section id="chat"></section>
  <section id="timeline">
    <h3>Timeline</h3>
    <ol id="timelineList"></ol>
  </section>
  <section id="toolLogs">
    <h3>Tool Logs</h3>
    <div id="toolLogEntries"></div>
  </section>
  <section id="contextPanel">
    <h3>Context</h3>
    <canvas id="memoryChart"></canvas>
    <div id="contextEntries"></div>
  </section>
  <section id="controls">
    <div>
      <label>Mode:
        <select id="modeSelect">
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
        </select>
      </label>
    </div>
    <div id="agentFilters">
      <span>Agents:</span>
      <button data-agent="all" class="agent-filter chip selected">All</button>
      <button data-agent="planner" class="agent-filter chip">Planner</button>
      <button data-agent="coder" class="agent-filter chip">Coder</button>
      <button data-agent="reviewer" class="agent-filter chip">Reviewer</button>
    </div>
    <div id="inputRow">
      <textarea id="prompt" placeholder="Ask CodeGeni to work on your code..."></textarea>
      <button id="send">Send</button>
      <button id="cancel">Cancel</button>
    </div>
    <div>
      <input type="password" id="apiKey" placeholder="API Key" />
      <button id="storeKey">Save Key</button>
      <button id="clearKey">Clear Key</button>
    </div>
  </section>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
