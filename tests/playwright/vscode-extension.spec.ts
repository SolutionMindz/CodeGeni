import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";

const shouldRunExtensionE2E = Boolean(process.env.CODEGENI_RUN_VSCODE_E2E);

test.describe("VS Code extension E2E", () => {
  test.skip(!shouldRunExtensionE2E, "Set CODEGENI_RUN_VSCODE_E2E=1 to run the VS Code extension smoke test.");

  test("npm test passes inside the VS Code extension", async () => {
    const { exitCode, stdout, stderr } = await runCommand("npm", ["test"], {
      cwd: "extensions/vscode-codegeni",
      env: { ...process.env, CI: "1" }
    });

    expect(exitCode).toBe(0);
    test.info().attachments.push({ name: "vsce-stdout", body: stdout, contentType: "text/plain" });
    if (stderr.length > 0) {
      test.info().attachments.push({ name: "vsce-stderr", body: stderr, contentType: "text/plain" });
    }
  });
});

function runCommand(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }): Promise<{ exitCode: number; stdout: Buffer; stderr: Buffer }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout?.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout: Buffer.concat(stdoutChunks), stderr: Buffer.concat(stderrChunks) });
    });
  });
}
