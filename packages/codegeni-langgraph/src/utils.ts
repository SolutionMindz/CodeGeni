import type { GraphContext, GraphEvent } from "./types";

export function pushEvent(context: GraphContext, event: Omit<GraphEvent, "timestamp">): void {
  context.events.push({ ...event, timestamp: new Date().toISOString() });
}

export function nextId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}
