import { performance } from "node:perf_hooks";
import { ToolContext, ToolError } from "../base";
import { ensureWorkspacePrefix } from "./path";

export interface SpawnOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  streaming?: boolean;
}

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export async function runProcess(
  context: ToolContext,
  { args, cwd, env, timeoutMs = 30_000 }: SpawnOptions
): Promise<SpawnResult> {
  const resolvedCwd = cwd
    ? ensureWorkspacePrefix(context.workspaceRoot, cwd)
    : context.workspaceRoot;

  const finalEnv = { ...process.env, ...context.env, ...env };
  const start = performance.now();

  const subProcess = Bun.spawn(args, {
    cwd: resolvedCwd,
    env: finalEnv,
    stdout: "pipe",
    stderr: "pipe"
  });

  const abort = new AbortController();
  const timer = setTimeout(() => {
    abort.abort();
    subProcess.kill();
  }, timeoutMs);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(subProcess.stdout).text(),
      new Response(subProcess.stderr).text(),
      subProcess.exited
    ]);

    if (abort.signal.aborted) {
      throw new ToolError("PROCESS_TIMEOUT", `${args.join(" ")} timed out`, 504);
    }

    return {
      stdout,
      stderr,
      exitCode,
      durationMs: Math.round(performance.now() - start)
    };
  } finally {
    clearTimeout(timer);
  }
}
