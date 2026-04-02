import { embedTexts } from "./embedder";
import type { MemorySearchResult } from "./types";
import { CodegeniMemoryStore } from "./store";

export interface SearchCodebaseOptions {
  store: CodegeniMemoryStore;
  workspaceRoot: string;
  query: string;
  workspaceId?: string;
  topK?: number;
  minScore?: number;
}

const DEFAULT_TOP_K = 8;
const DEFAULT_MIN_SCORE = 0.35;

export async function searchCodebase(options: SearchCodebaseOptions): Promise<MemorySearchResult[]> {
  const { store, workspaceRoot, query, topK = DEFAULT_TOP_K, minScore = DEFAULT_MIN_SCORE } = options;
  const workspaceId = options.workspaceId ?? CodegeniMemoryStore.workspaceIdFromPath(workspaceRoot);
  const [queryEmbedding] = await embedTexts([query]);
  if (!queryEmbedding) {
    return [];
  }
  const { results, documents, scores } = await store.queryByEmbedding(workspaceId, queryEmbedding, topK);
  return results
    .map((chunk, index) => {
      const distance = scores[index] ?? 0;
      const score = Math.max(0, 1 - distance);
      return {
        chunk,
        document: documents[index],
        score
      };
    })
    .filter((item) => item.score >= minScore);
}
