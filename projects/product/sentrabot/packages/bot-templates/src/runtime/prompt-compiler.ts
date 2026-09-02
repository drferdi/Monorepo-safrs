import type { PromptLayer } from '../domain/types';

export function compilePrompt(layers: PromptLayer[]): string {
  const seen = new Set<string>();
  for (const layer of layers) {
    if (seen.has(layer.id)) throw new Error(`Duplicate prompt layer id: ${layer.id}`);
    seen.add(layer.id);
  }

  return [...layers]
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .map(layer => {
      const boundary = layer.safetyBoundary ? 'SAFETY_BOUNDARY:ENFORCED' : 'SAFETY_BOUNDARY:INHERITED';
      return `\n=== LAYER ${layer.priority}: ${layer.id} ===\n${boundary}\n${layer.content.trim()}\n`;
    })
    .join('');
}
