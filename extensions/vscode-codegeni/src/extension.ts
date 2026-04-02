import * as vscode from "vscode";
import { ChatService } from "./chat/chatService";
import { ChatPanelProvider } from "./chat/webviewProvider";

export async function activate(context: vscode.ExtensionContext) {
  const chatService = new ChatService(context);
  const provider = new ChatPanelProvider(context.extensionUri, chatService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatPanelProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codegeni.chat.open", () => provider.reveal()),
    vscode.commands.registerCommand("codegeni.chat.send", async () => {
      const text = await vscode.window.showInputBox({ prompt: "Send message to CodeGeni" });
      if (typeof text === "string") {
        await chatService.sendMessage(text, { workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri });
      }
    }),
    vscode.commands.registerCommand("codegeni.chat.cancel", () => chatService.cancel()),
    vscode.commands.registerCommand("codegeni.chat.logout", async () => {
      await chatService.clearApiKey();
      vscode.window.showInformationMessage("CodeGeni: API key cleared.");
    }),
    vscode.commands.registerCommand("codegeni.chat.showDiff", async (relativePath: string) => {
      await chatService.showDiff(String(relativePath ?? ""), vscode.workspace.workspaceFolders?.[0]?.uri);
    })
  );

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("codegeni.chat.mode")) {
      const mode = vscode.workspace.getConfiguration("codegeni").get("chat.mode", "auto");
      chatService.setMode(mode === "manual" ? "manual" : "auto");
    }
  });
}

export function deactivate(): void {
  // noop
}
