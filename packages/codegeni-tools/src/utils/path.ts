import path from "node:path";
import { ToolError } from "../base";

export function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(root)) {
    throw new ToolError("PATH_OUTSIDE_WORKSPACE", `${relativePath} is outside the workspace`, 403);
  }
  return target;
}

export function ensureWorkspacePrefix(workspaceRoot: string, inputPath: string): string {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(inputPath);
  if (!target.startsWith(root)) {
    throw new ToolError("PATH_OUTSIDE_WORKSPACE", `${inputPath} is outside the workspace`, 403);
  }
  return target;
}
