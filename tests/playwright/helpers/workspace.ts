import fs from "node:fs/promises";
import path from "node:path";
import type { TestInfo } from "@playwright/test";

export async function createFixtureWorkspace(testInfo: TestInfo): Promise<string> {
  const workspaceRoot = testInfo.outputPath("fixture-workspace");
  await fs.mkdir(path.join(workspaceRoot, "src"), { recursive: true });

  await fs.writeFile(
    path.join(workspaceRoot, "README.md"),
    "# Fixture Workspace\n\nThis workspace is generated during Playwright tests.\n",
    "utf8"
  );

  await fs.writeFile(
    path.join(workspaceRoot, "src", "app.py"),
    [
      "def greet(name: str) -> str:",
      "    message = f\"Hello, {name}\"",
      "    print(message)",
      "    return message",
      "",
      "def add(a: int, b: int) -> int:",
      "    return a + b",
      "",
      "if __name__ == '__main__':",
      "    greet('world')",
      ""].join("\n"),
    "utf8"
  );

  await fs.writeFile(
    path.join(workspaceRoot, "src", "math_utils.py"),
    [
      "class Calculator:",
      "    def add(self, a: int, b: int) -> int:",
      "        return a + b",
      "",
      "def fibonacci(n: int) -> int:",
      "    if n <= 1:",
      "        return n",
      "    return fibonacci(n - 1) + fibonacci(n - 2)",
      ""].join("\n"),
    "utf8"
  );

  await fs.writeFile(
    path.join(workspaceRoot, "src", "component.ts"),
    [
      "export function sum(values: number[]): number {",
      "  return values.reduce((total, value) => total + value, 0);",
      "}",
      "",
      "export class Greeter {",
      "  constructor(private readonly name: string) {}",
      "  run(): string {",
      "    return `hello ${this.name}`;",
      "  }",
      "}",
      ""].join("\n"),
    "utf8"
  );

  return workspaceRoot;
}
