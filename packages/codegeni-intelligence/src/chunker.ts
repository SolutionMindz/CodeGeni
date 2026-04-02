import Parser, { SyntaxNode } from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";
import { typescript as TypeScript, tsx as TSX } from "tree-sitter-typescript";

export interface ChunkCandidate {
  filePath: string;
  startLine: number;
  endLine: number;
  chunkType: "symbol" | "block";
  symbolName?: string;
  symbolKind?: string;
  text: string;
}

export interface ChunkSourceRequest {
  content: string;
  filePath: string;
  language: string;
  fallbackChunkLines?: number;
  fallbackOverlapLines?: number;
}

interface LanguageConfig {
  language: Parser.Language;
  symbolTypes: string[];
  identifierFields: string[];
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  javascript: {
    language: JavaScript,
    symbolTypes: ["function_declaration", "class_declaration", "method_definition"],
    identifierFields: ["name", "identifier", "property_identifier"]
  },
  typescript: {
    language: TypeScript,
    symbolTypes: ["function_declaration", "class_declaration", "method_definition"],
    identifierFields: ["name", "identifier", "property_identifier"]
  },
  tsx: {
    language: TSX,
    symbolTypes: ["function_declaration", "class_declaration", "method_definition"],
    identifierFields: ["name", "identifier", "property_identifier"]
  },
  python: {
    language: Python,
    symbolTypes: ["function_definition", "class_definition"],
    identifierFields: ["name", "identifier"]
  }
};

const parserCache = new Map<string, Parser>();

function getParser(languageKey: string, config: LanguageConfig): Parser {
  if (!parserCache.has(languageKey)) {
    const parser = new Parser();
    parser.setLanguage(config.language);
    parserCache.set(languageKey, parser);
  }
  return parserCache.get(languageKey)!;
}

export function chunkSourceFile(request: ChunkSourceRequest): ChunkCandidate[] {
  const fallbackChunkLines = request.fallbackChunkLines ?? 80;
  const fallbackOverlapLines = request.fallbackOverlapLines ?? 20;
  const config = LANGUAGE_CONFIGS[request.language.toLowerCase()];
  const lines = request.content.split(/\r?\n/);

  if (!config) {
    return chunkByLines(lines, request.filePath, fallbackChunkLines, fallbackOverlapLines);
  }

  const parser = getParser(request.language.toLowerCase(), config);
  const tree = parser.parse(request.content);
  const symbolChunks = collectSymbolChunks(tree.rootNode, config, request);

  if (!symbolChunks.length) {
    return chunkByLines(lines, request.filePath, fallbackChunkLines, fallbackOverlapLines);
  }

  const coverage = new Array(lines.length).fill(false);
  for (const chunk of symbolChunks) {
    for (let i = chunk.startLine - 1; i < chunk.endLine && i < coverage.length; i += 1) {
      coverage[i] = true;
    }
  }

  const uncoveredChunks = buildUncoveredChunks(
    lines,
    coverage,
    request.filePath,
    fallbackChunkLines,
    fallbackOverlapLines
  );

  return [...symbolChunks, ...uncoveredChunks];
}

function collectSymbolChunks(
  root: SyntaxNode,
  config: LanguageConfig,
  request: ChunkSourceRequest
): ChunkCandidate[] {
  const stack: SyntaxNode[] = [root];
  const chunks: ChunkCandidate[] = [];

  while (stack.length) {
    const node = stack.pop()!;
    if (config.symbolTypes.includes(node.type)) {
      const symbolName = extractSymbolName(node, config.identifierFields);
      const snippet = request.content.slice(node.startIndex, node.endIndex);
      chunks.push({
        filePath: request.filePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        chunkType: "symbol",
        symbolName,
        symbolKind: node.type,
        text: snippet
      });
    }

    for (const child of node.namedChildren) {
      stack.push(child);
    }
  }

  return chunks;
}

function extractSymbolName(node: SyntaxNode, identifierFields: string[]): string | undefined {
  const fieldMatch = identifierFields
    .map((field) => node.childForFieldName(field))
    .find((child): child is SyntaxNode => Boolean(child));
  if (fieldMatch) {
    return fieldMatch.text;
  }

  for (const child of node.namedChildren) {
    if (identifierFields.includes(child.type)) {
      return child.text;
    }
  }

  return undefined;
}

function chunkByLines(
  lines: string[],
  filePath: string,
  chunkSize: number,
  overlap: number
): ChunkCandidate[] {
  const chunks: ChunkCandidate[] = [];
  let start = 0;

  while (start < lines.length) {
    const end = Math.min(start + chunkSize, lines.length);
    const text = lines.slice(start, end).join("\n");
    chunks.push({
      filePath,
      startLine: start + 1,
      endLine: end,
      chunkType: "block",
      text
    });
    if (end === lines.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

function buildUncoveredChunks(
  lines: string[],
  coverage: boolean[],
  filePath: string,
  chunkSize: number,
  overlap: number
): ChunkCandidate[] {
  const uncoveredChunks: ChunkCandidate[] = [];
  let index = 0;

  while (index < lines.length) {
    if (coverage[index]) {
      index += 1;
      continue;
    }
    const start = index;
    while (index < lines.length && !coverage[index]) {
      index += 1;
    }
    const blockLines = lines.slice(start, index);
    if (!blockLines.length) {
      continue;
    }
    const blockChunks = chunkByLines(blockLines, filePath, chunkSize, overlap).map((chunk) => ({
      ...chunk,
      startLine: chunk.startLine + start,
      endLine: chunk.endLine + start
    }));
    uncoveredChunks.push(...blockChunks);
  }

  return uncoveredChunks;
}
