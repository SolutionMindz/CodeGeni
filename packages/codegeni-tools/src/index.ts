export { ToolRegistry, ToolDefinition, ToolContext, ToolError, ToolPermission } from "./base";
export type { ToolLogEvent } from "./base";

import { ToolRegistry } from "./base";
import { readFileTool } from "./tools/fs/read-file";
import { writeFileTool } from "./tools/fs/write-file";
import { listDirectoryTool } from "./tools/fs/list-directory";
import { searchFilesTool } from "./tools/fs/search-files";
import { runShellTool } from "./tools/exec/run-shell";
import { gitStatusTool } from "./tools/git/git-status";
import { gitDiffTool } from "./tools/git/git-diff";
import { gitCommitTool } from "./tools/git/git-commit";
import { codegeniScanTool } from "./tools/code/codegeni-scan";
import { testRunnerTool } from "./tools/code/test-runner";
import { indexWorkspaceTool } from "./tools/memory/index-workspace";
import { searchCodebaseTool } from "./tools/memory/search-codebase";
import { findSymbolTool } from "./tools/intelligence/find-symbol";
import { dockerExecTool } from "./tools/exec/docker-exec";

export function createCodegeniToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    searchFilesTool,
    runShellTool,
    gitStatusTool,
    gitDiffTool,
    gitCommitTool,
    codegeniScanTool,
    testRunnerTool,
    indexWorkspaceTool,
    searchCodebaseTool,
    findSymbolTool,
    dockerExecTool
  ].forEach((tool) => registry.register(tool));

  return registry;
}
