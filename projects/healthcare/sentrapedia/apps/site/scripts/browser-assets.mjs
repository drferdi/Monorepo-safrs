import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Source-only fragments are assembled into existing entrypoint URLs. No runtime loader or new dependency.
export const browserParts = {
  'design-audit.js': ['menu', 'cards', 'contact', 'reveal'],
  'hero-workspace.js': ['hero-bindings', 'hero-timeline'],
  'capability-explorer.js': ['capability-scene', 'capability-viewport'],
  'clinical-video.js': ['playback-listeners'],
  'workflow-playback.js': ['playback-listeners'],
};

export async function assembleBrowserScript(root, filename) {
  const parts = await Promise.all(browserParts[filename].map(name => readFile(path.join(root, 'scripts/browser', name + '.js'), 'utf8')));
  const entry = await readFile(path.join(root, 'assets', filename), 'utf8');
  const code = [...parts, entry].join('\n');
  return filename === 'capability-explorer.js' ? code : '(() => {\n' + code + '\n})();\n';
}
