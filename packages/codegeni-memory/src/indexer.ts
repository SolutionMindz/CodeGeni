import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";
import fg from "fast-glob";
import { chunkSourceFile, ChunkCandidate } from "@codegeni/intelligence";
import { embedTexts } from "./embedder";
import type { CodeChunk, WorkspaceIndexStats } from "./types";
import { CodegeniMemoryStore } from "./store";

const DEFAULT_INCLUDE = [
  "src/**/*.{ts,tsx,js,jsx,py,go,rs,java,kt,swift,rb,php,cs,cpp,c,h,md}",
  "**/*.{ts,tsx,js,jsx,py,go,rs,java,kt,swift,rb,php,cs,cpp,c,h,md}",
  "*.{md,txt}"
];

const DEFAULT_EXCLUDE = [
  "node_modules",
  ".git",
  ".venv",
  "dist",
  "build",
  "coverage",
  "*.lock"
];

const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".md": "markdown",
  ".txt": "text"
};

export interface IndexWorkspaceOptions {
  workspaceRoot: string;
  workspaceId?: string;
  store: CodegeniMemoryStore;
  include?: string[];
  exclude?: string[];
  maxFileSizeBytes?: number;
  chunkSizeLines?: number;
  chunkOverlapLines?: number;
}

const DEFAULT_MAX_FILE_SIZE = 512 * 1024; // 512 KB
const DEFAULT_CHUNK_LINES = 80;
const DEFAULT_CHUNK_OVERLAP = 20;
const BATCH_SIZE = 32;

export async function indexWorkspace(options: IndexWorkspaceOptions): Promise<WorkspaceIndexStats> {
  const {
    workspaceRoot,
    store,
    include = DEFAULT_INCLUDE,
    exclude = DEFAULT_EXCLUDE,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
    chunkSizeLines = DEFAULT_CHUNK_LINES,
    chunkOverlapLines = DEFAULT_CHUNK_OVERLAP
  } = options;

  const workspaceId = options.workspaceId ?? CodegeniMemoryStore.workspaceIdFromPath(workspaceRoot);
  const files = await fg(include, {
    cwd: workspaceRoot,
    ignore: exclude,
    absolute: true,
    dot: false
  });

  const stats: WorkspaceIndexStats = {
    workspaceId,
    filesProcessed: 0,
    chunksIndexed: 0,
    skipped: 0,
    durationMs: 0
  };

  const started = performance.now();

  for (const absolutePath of files) {
    const relPath = path.relative(workspaceRoot, absolutePath) || path.basename(absolutePath);
    try {
      const fileStats = await fs.stat(absolutePath);
      if (!fileStats.isFile() || fileStats.size > maxFileSizeBytes) {
        stats.skipped += 1;
        continue;
      }
      const content = await fs.readFile(absolutePath, "utf-8");
      const language = detectLanguage(absolutePath);
      const chunkCandidates = chunkSourceFile({
        content,
        filePath: relPath,
        language,
        fallbackChunkLines: chunkSizeLines,
        fallbackOverlapLines: chunkOverlapLines
      });
      const chunks = toCodeChunks(chunkCandidates, language, fileStats.mtimeMs);

      if (!chunks.length) {
        stats.skipped += 1;
        continue;
      }

      await upsertInBatches(store, workspaceId, chunks);
      stats.filesProcessed += 1;
      stats.chunksIndexed += chunks.length;
    } catch (error) {
      console.warn(`Failed to index ${relPath}:`, error);
      stats.skipped += 1;
    }
  }

  stats.durationMs = Math.round(performance.now() - started);
  return stats;
}

function toCodeChunks(
  candidates: ChunkCandidate[],
  language: string,
  fileMtimeMs: number
): CodeChunk[] {
  const indexedAt = new Date().toISOString();
  return candidates.map((candidate) => ({
    id: crypto
      .createHash("sha1")
      .update(candidate.filePath)
      .update(String(candidate.startLine))
      .update(String(candidate.endLine))
      .digest("hex"),
    filePath: candidate.filePath,
    language,
    startLine: candidate.startLine,
    endLine: candidate.endLine,
    chunkType: candidate.chunkType,
    symbolName: candidate.symbolName,
    symbolKind: candidate.symbolKind,
    indexedAt,
    text: candidate.text,
    fileMtimeMs
  }));
}

async function upsertInBatches(
  store: CodegeniMemoryStore,
  workspaceId: string,
  chunks: CodeChunk[]
): Promise<void> {
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedTexts(batch.map((chunk) => chunk.text));
    const enriched = batch.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddings[idx]
    }));
    await store.upsert(workspaceId, enriched);
  }
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_BY_EXT[ext] ?? "text";
}
