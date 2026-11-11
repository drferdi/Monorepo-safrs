import { clinicalNote } from '../assets/clinical-note.config.mjs';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function content(line) {
  if (line.differentials) return line.differentials.map((text, i) => i ? `<span class="clinical-note-alternative">${escape(text)}<svg viewBox="0 0 120 16" preserveAspectRatio="none" aria-hidden="true"><path class="clinical-note-strike" d="M3 11 Q42 3 117 7"/></svg></span>` : escape(text)).join(' / ');
  if (line.decision) return `<span class="clinical-note-decision">${escape(line.decision)}<svg viewBox="0 0 120 52" preserveAspectRatio="none" aria-hidden="true"><path class="clinical-note-circle" d="M108 12 C78 -1 11 2 5 24 C-1 48 93 53 112 32 C122 20 100 6 81 5"/></svg></span> ${escape(line.text)}`;
  return escape(line.text);
}

export function renderClinicalNote(data = clinicalNote) {
  const rows = data.rows.map((row, index) => `<div class="clinical-note-row" data-step="${index + 1}"><p class="clinical-note-label">${escape(row.label)}</p>${row.lines.map(line => {
    const ghost = line.differentials ? line.differentials.join(' / ') : [line.decision, line.text].filter(Boolean).join(' ');
    return `<div class="clinical-note-line clinical-note-${escape(line.author)}"><span class="clinical-note-ink" aria-label="${escape(data.authors[line.author])}: ${escape(ghost)}">${content(line)}</span></div>`;
  }).join('')}</div>`).join('\n');
  return `<div id="clinical-note" class="clinical-note" tabindex="-1" aria-labelledby="clinical-note-title"><div class="clinical-note-header"><p id="clinical-note-title">${escape(data.title)}</p><p>${escape(data.patient)}</p><p class="clinical-note-status">${escape(data.status)}</p><div class="clinical-note-authors"><span>${escape(data.authors.doctor)}</span><span>${escape(data.authors.sentrapedia)}</span></div></div>${rows}</div>`;
}
