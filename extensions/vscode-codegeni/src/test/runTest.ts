import path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");
    const workspace = path.resolve(__dirname, "../../test-fixtures/simple-workspace");

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspace, "--disable-workspace-trust", "--skip-getting-started", "--skip-release-notes"]
    });
  } catch (err) {
    console.error("VS Code extension tests failed:", err);
    process.exit(1);
  }
}

main();
