export const anatomyLayers = Object.freeze([
  { id: 'base', stage: null, lift: 0 },
  { id: 'board', stage: null, lift: 24 },
  { id: 'context', stage: 0, lift: 68 },
  { id: 'processor', stage: 1, lift: 108 },
  { id: 'knowledge', stage: 2, lift: 84 },
  { id: 'document', stage: 3, lift: 44 }
]);

export function anatomyTargets(selection) {
  if (selection !== null && (!Number.isInteger(selection) || selection < 0 || selection > 3)) throw new RangeError('Unknown anatomy feature');
  return Object.fromEntries(anatomyLayers.map(layer => [layer.id,
    layer.id === 'base' ? 0 : layer.id === 'board' ? 24 : 24 + (selection === null || layer.stage === selection ? layer.lift : 0)
  ]));
}

export function anatomyAssembly(name) {
  if (name.startsWith('input-')) return 'context';
  if (name.startsWith('processor-')) return 'processor';
  if (name.startsWith('memory-')) return 'knowledge';
  if (name.startsWith('document-')) return 'document';
  if (name === 'system-board' || name === 'review-control') return 'board';
  return 'base';
}
