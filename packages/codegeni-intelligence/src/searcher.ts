import { chunkSourceFile, ChunkSourceRequest, ChunkCandidate } from "./chunker";

export interface SymbolSearchOptions extends Omit<ChunkSourceRequest, "fallbackChunkLines" | "fallbackOverlapLines"> {
  query: string;
  maxResults?: number;
}

export interface SymbolSearchHit {
  filePath: string;
  symbolName?: string;
  symbolKind?: string;
  startLine: number;
  endLine: number;
  snippet: string;
  score: number;
}

export function findSymbols(options: SymbolSearchOptions): SymbolSearchHit[] {
  const { query, maxResults = 10, ...chunkOptions } = options;
  const candidates = chunkSourceFile({
    ...chunkOptions,
    fallbackChunkLines: 0,
    fallbackOverlapLines: 0
  }).filter((chunk) => chunk.chunkType === "symbol");

  const normalizedQuery = query.toLowerCase();
  const hits = candidates
    .map((chunk) => createHit(chunk, normalizedQuery))
    .filter((hit): hit is SymbolSearchHit => Boolean(hit))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return hits;
}

function createHit(chunk: ChunkCandidate, term: string): SymbolSearchHit | undefined {
  const name = chunk.symbolName ?? chunk.symbolKind;
  if (!name) {
    return undefined;
  }
  const normalizedName = name.toLowerCase();
  if (!normalizedName.includes(term)) {
    return undefined;
  }

  const overlap = term.length / normalizedName.length;
  return {
    filePath: chunk.filePath,
    symbolName: chunk.symbolName,
    symbolKind: chunk.symbolKind,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
    snippet: chunk.text.slice(0, 500),
    score: overlap
  };
}
