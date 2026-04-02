import * as assert from "assert";
import * as vscode from "vscode";

describe("CodeGeni VS Code Extension", () => {
  it("activates and registers commands", async () => {
    const extension = vscode.extensions.getExtension("SolutionMind.codegeni");
    assert.ok(extension, "CodeGeni extension should be registered");

    await extension!.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("codegeni.scanWorkspace"));
    assert.ok(commands.includes("codegeni.refreshView"));
  });

  it("executes refresh command without throwing", async () => {
    await vscode.commands.executeCommand("codegeni.refreshView");
  });
});
