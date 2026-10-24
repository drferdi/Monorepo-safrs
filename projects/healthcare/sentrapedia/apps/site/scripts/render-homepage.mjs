import { renderClinicalNote } from './clinical-note.mjs';
import { renderSystemAnatomy } from './system-anatomy.mjs';
import { renderCapabilityAnatomy } from './capability-anatomy.mjs';
import { capabilityPanelSlugs, renderCapabilityPanel } from './capability-panels.mjs';


export function renderHomepage(original) {
const note = /<!-- clinical-note:start -->[\s\S]*?<!-- clinical-note:end -->/g;
if ([...original.matchAll(note)].length !== 1) throw new Error('Expected exactly one clinical note fragment');
const anatomy = renderSystemAnatomy();
let homepage = original.replace(note, () => '<!-- clinical-note:start -->' + renderClinicalNote() + '<!-- clinical-note:end -->')
  .replace(/<!-- system-anatomy:start -->[\s\S]*?<!-- system-anatomy:end -->/, () => '<!-- system-anatomy:start -->' + anatomy.svg + '<!-- system-anatomy:end -->')
  .replace(/data-projection='[^']*'/, () => `data-projection='${JSON.stringify(anatomy.projection)}'`);
for (const kind of ['gateway', 'modes']) {
  const fragment = new RegExp('<!-- capability-anatomy:' + kind + ':start -->[\\s\\S]*?<!-- capability-anatomy:' + kind + ':end -->');
  const rendered = renderCapabilityAnatomy(kind);
  if (!fragment.test(homepage)) throw new Error('Missing capability anatomy fragment: ' + kind);
  homepage = homepage.replace(fragment, () => '<!-- capability-anatomy:' + kind + ':start -->' + rendered.html + '<!-- capability-anatomy:' + kind + ':end -->');
}
const slugs = capabilityPanelSlugs();
const liveFragments = /<!-- capability-live:([a-z0-9-]+):start -->[\s\S]*?<!-- capability-live:\1:end -->/g;
const existingLive = [...homepage.matchAll(liveFragments)];
if (existingLive.length === slugs.length) {
  const found = existingLive.map(match => match[1]);
  if (found.some((slug, index) => slug !== slugs[index])) throw new Error('Capability panel order changed');
  homepage = homepage.replace(liveFragments, (_fragment, slug) => renderCapabilityPanel(slug));
} else throw new Error('Incomplete capability panel fragments');
return homepage;
}
