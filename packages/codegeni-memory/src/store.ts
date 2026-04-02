import crypto from "node:crypto";
import { ChromaClient, Collection } from "chromadb";
import type { CodeChunk, CodeChunkMetadata } from "./types";

export interface MemoryStoreConfig {
  baseUrl?: string;
  collectionPrefix?: string;
}

const DEFAULT_PREFIX = "codegeni_workspace";

export class CodegeniMemoryStore {
  private readonly client: ChromaClient;
  private readonly collectionCache = new Map<string, Promise<Collection>>();

  constructor(private readonly config: MemoryStoreConfig = {}) {
    this.client = new ChromaClient({
      path: config.baseUrl,
      fetchOptions: {
        method: "POST"
      }
    });
  }

  static workspaceIdFromPath(workspacePath: string): string {
    return crypto.createHash("sha1").update(workspacePath).digest("hex").slice(0, 12);
  }

  private collectionName(workspaceId: string): string {
    const prefix = this.config.collectionPrefix ?? DEFAULT_PREFIX;
    return `${prefix}_${workspaceId}`;
  }

  private async getCollection(workspaceId: string): Promise<Collection> {
    if (!this.collectionCache.has(workspaceId)) {
      const promise = this.client.getOrCreateCollection({
        name: this.collectionName(workspaceId)
      });
      this.collectionCache.set(workspaceId, promise);
    }
    return this.collectionCache.get(workspaceId)!;
  }

  async upsert(workspaceId: string, chunks: CodeChunk[]): Promise<void> {
    if (!chunks.length) {
      return;
    }
    const collection = await this.getCollection(workspaceId);
    await collection.upsert({
      ids: chunks.map((chunk) => chunk.id),
      documents: chunks.map((chunk) => chunk.text),
      embeddings: chunks.map((chunk) => chunk.embedding ?? []),
      metadatas: chunks.map((chunk) => ({
        filePath: chunk.filePath,
        language: chunk.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        chunkType: chunk.chunkType,
        symbolName: chunk.symbolName,
        symbolKind: chunk.symbolKind,
        indexedAt: chunk.indexedAt,
        fileMtimeMs: chunk.fileMtimeMs
      }))
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const name = this.collectionName(workspaceId);
    await this.client.deleteCollection({ name });
    this.collectionCache.delete(workspaceId);
  }

  async queryByEmbedding(
    workspaceId: string,
    embedding: number[],
    topK: number
  ): Promise<{ results: CodeChunkMetadata[]; documents: string[]; scores: number[] }> {
    const collection = await this.getCollection(workspaceId);
    const response = await collection.query({
      queryEmbeddings: [embedding],
      nResults: topK
    });

    const documents = response.documents?.[0] ?? [];
    const metadatas = (response.metadatas?.[0] ?? []) as CodeChunkMetadata[];
    const scores = response.distances?.[0] ?? [];
    return { results: metadatas, documents, scores };
  }
}
