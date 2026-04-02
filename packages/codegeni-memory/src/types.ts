export interface CodeChunkMetadata {
  id: string;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  chunkType: "block" | "symbol";
  symbolName?: string;
  symbolKind?: string;
  indexedAt: string;
  fileMtimeMs: number;
}

export interface CodeChunk extends CodeChunkMetadata {
  text: string;
  embedding?: number[];
}

export interface MemorySearchResult {
  score: number;
  chunk: CodeChunkMetadata;
  document: string;
}

export interface WorkspaceIndexStats {
  workspaceId: string;
  filesProcessed: number;
  chunksIndexed: number;
  skipped: number;
  durationMs: number;
}
