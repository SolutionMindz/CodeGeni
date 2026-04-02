import type { Pipeline } from "@xenova/transformers";
import { pipeline } from "@xenova/transformers";

const DEFAULT_MODEL = process.env.CODEGENI_EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2";

let embeddingPipelinePromise: Promise<Pipeline> | null = null;

async function getEmbeddingPipeline(): Promise<Pipeline> {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline("feature-extraction", DEFAULT_MODEL, {
      quantized: true
    });
  }
  return embeddingPipelinePromise;
}

function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return vector;
  }
  return vector.map((value) => value / norm);
}

function coerceToArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value as number[];
  }
  if (value instanceof Float32Array) {
    return Array.from(value);
  }
  if (typeof value === "object" && value !== null && "data" in value) {
    const maybeData = (value as { data?: number[] | Float32Array }).data;
    if (Array.isArray(maybeData)) {
      return maybeData;
    }
    if (maybeData instanceof Float32Array) {
      return Array.from(maybeData);
    }
  }
  throw new Error("Unable to convert embedding output to array");
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }
  const embedder = await getEmbeddingPipeline();
  const outputs = await embedder(texts, { pooling: "mean", normalize: true });
  const list = Array.isArray(texts) && texts.length === 1 ? [outputs] : (outputs as unknown[]);
  return list.map((vector) => normalizeVector(coerceToArray(vector)));
}
