import path from "node:path";
import { PassThrough } from "node:stream";
import { performance } from "node:perf_hooks";
import Docker from "dockerode";

export interface SandboxRunOptions {
  workspacePath: string;
  cmd: string[];
  image?: string;
  timeoutSec?: number;
  env?: Record<string, string>;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

const DEFAULT_IMAGE = process.env.CODEGENI_SANDBOX_IMAGE ?? "codegeni-sandbox:latest";
const DEFAULT_TIMEOUT = 120;

const DEFAULT_HOST_CONFIG: Docker.ContainerCreateOptions["HostConfig"] = {
  AutoRemove: false,
  NetworkMode: "none",
  CapDrop: ["ALL"],
  SecurityOpt: ["no-new-privileges:true"],
  ReadonlyRootfs: true,
  Tmpfs: { "/tmp": "size=64m,noexec" },
  Memory: 256 * 1024 * 1024,
  MemorySwap: 256 * 1024 * 1024,
  CpuPeriod: 100000,
  CpuQuota: 50000,
  PidsLimit: 64
};

export class SandboxError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export class SandboxTimeoutError extends SandboxError {
  constructor(message: string) {
    super(message, "SANDBOX_TIMEOUT");
  }
}

export class DockerSandboxRunner {
  private readonly docker: Docker;

  constructor(options?: Docker.DockerOptions) {
    this.docker = new Docker(options);
  }

  async run(options: SandboxRunOptions): Promise<SandboxResult> {
    const workspacePath = path.resolve(options.workspacePath);
    const binds = [`${workspacePath}:/workspace:rw`];
    const env = options.env
      ? Object.entries(options.env).map(([key, value]) => `${key}=${value}`)
      : undefined;

    const container = await this.docker.createContainer({
      Image: options.image ?? DEFAULT_IMAGE,
      Cmd: options.cmd,
      WorkingDir: "/workspace",
      Env: env,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      HostConfig: {
        ...DEFAULT_HOST_CONFIG,
        Binds: binds
      },
      User: "1000:1000"
    });

    const attachStream = await container.attach({ stream: true, stdout: true, stderr: true });
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();

    // dockerode demux helper is not typed
    (this.docker.modem as any).demuxStream(attachStream, stdoutStream, stderrStream);

    const stdoutPromise = collectStream(stdoutStream);
    const stderrPromise = collectStream(stderrStream);

    await container.start();

    const timeoutMs = (options.timeoutSec ?? DEFAULT_TIMEOUT) * 1000;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      container.kill().catch(() => undefined);
    }, timeoutMs);

    const start = performance.now();
    try {
      const waitResult = await container.wait();
      clearTimeout(timer);
      stdoutStream.end();
      stderrStream.end();
      const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
      await container.remove({ force: true });
      if (timedOut) {
        throw new SandboxTimeoutError(`Sandbox exceeded ${timeoutMs}ms`);
      }
      return {
        stdout,
        stderr,
        exitCode: waitResult.StatusCode ?? 0,
        durationMs: Math.round(performance.now() - start)
      };
    } catch (error) {
      clearTimeout(timer);
      stdoutStream.end();
      stderrStream.end();
      await container.remove({ force: true }).catch(() => undefined);
      if (timedOut) {
        throw new SandboxTimeoutError(`Sandbox exceeded ${timeoutMs}ms`);
      }
      if (error instanceof SandboxError) {
        throw error;
      }
      throw new SandboxError((error as Error).message, "SANDBOX_ERROR");
    }
  }
}

async function collectStream(stream: PassThrough): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}
