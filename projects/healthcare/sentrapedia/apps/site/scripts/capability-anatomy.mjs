import * as k from './vendor/anatomy-kit.mjs';
import { orderPrisms } from './system-anatomy.mjs';
import { documentationSlots, gatewayPhases } from '../assets/capability-anatomy.js';

// Workflow metaphors, not physical deployment diagrams or clinical engines.
// Gateway parts: 4 feet, chassis, 4 board mounts, PCB, processor socket/core,
// 20 contacts, 7 cooling fins and 6 three-piece connector housings (57 solids).
// Modes parts: 4 feet, chassis, 3 magazine beds, 6 rails, 18 sockets,
// 18 cartridges, 18 pulls and a two-piece document tray (70 solids).
function instrument(kind) {
  const base = { x: -180, y: -114, w: 360, d: 228, r: 8 };
  const P = k.fitProjection(k.boxCorners(base, -14, 60), 800, 500, { pad: 56, azimuth: 50, elevation: 36 });
  const pieces = [];
  const line = (d, tone = 'faint', options = {}) => k.lineSvg(d, { tone, ...options });
  function slab(name, x, y, w, d, z, h, options = {}) {
    const plan = { x, y, w, d, r: options.r ?? 1 };
    const detail = options.detail ? line(k.planOutline(k.insetPlan(plan, Math.min(2, w / 5, d / 5)), z + h, P)) : '';
    const screws = options.screws ? k.dotsSvg(k.corners(plan, Math.min(4, w / 4, d / 4)).map(([a, b]) => k.iso([a, b, z + h], P)), { size: .55 }) : '';
    const svg = k.solidSvg(k.slabOf(plan, z, h, P, 4, Math.min(.6, h / 3)), { tone: options.tone ?? 'mid', inner: detail + screws + (options.inner ?? '') });
    const points = k.boxCorners(plan, z, z + h).map(point => k.iso(point, P));
    const lift = options.lift;
    const attributes = `data-feature-component="${name}"${options.phase !== undefined ? ` data-phase-part="${options.phase}"` : ''}${lift !== undefined ? ` data-feature-lift="${lift}"` : ''}${options.cartridge !== undefined ? ` data-cartridge="${options.cartridge}"` : ''}`;
    pieces.push({ name, assembly: lift === undefined ? 'fixed' : 'slot' + lift, min: [x, y, z], max: [x + w, y + d, z + h], box: [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))], depth: k.depthOf([x + w / 2, y + d / 2, z + h / 2], P), svg: `<g ${attributes}>${svg}</g>` });
  }
  for (const [x, y] of k.corners(base, 18)) slab('foot', x - 6, y - 6, 12, 12, -14, 6, { tone: 'lo' });
  slab('chassis', -180, -114, 360, 228, -8, 8, { r: 8, detail: true, screws: true, tone: 'lo' });
  return { P, pieces, slab, line };
}

function gatewayGeometry() {
  const { P, pieces, slab, line } = instrument('gateway');
  for (const [x, y] of [[-162, -96], [150, -96], [-162, 84], [150, 84]]) slab('board-mount', x, y, 12, 12, 0, 4, { screws: true });
  const routes = [];
  for (let i = 0; i < 3; i++) {
    const y = -70 + i * 62;
    routes.push([[-111, y + 14], [-68, y + 14], [-68, -24 + i * 24], [-48, -24 + i * 24]]);
    routes.push([[48, -24 + i * 24], [72, -24 + i * 24], [72, y + 14], [113, y + 14]]);
  }
  const traces = routes.map((route, i) => {
    const path = k.onTop(route, 6, P);
    const dots = k.dotsSvg([route[0], route.at(-1)].map(([x, y]) => k.iso([x, y, 6], P)), { size: 1 });
    return line(path, 'lo') + line(path, 'hi', { className: 'feature-data-flow' }) + dots;
  }).join('');
  slab('pcb', -168, -102, 336, 204, 4, 2, { r: 5, detail: true, inner: traces });
  slab('gateway-socket', -48, -48, 96, 96, 6, 3, { r: 4, detail: true, screws: true, phase: 1 });
  for (let i = 0; i < 5; i++) {
    const offset = -31 + i * 13;
    slab('contact', offset, -43, 7, 9, 9, 1);
    slab('contact', offset, 34, 7, 9, 9, 1);
    slab('contact', -43, offset, 9, 7, 9, 1);
    slab('contact', 34, offset, 9, 7, 9, 1);
  }
  slab('gateway-core', -27, -27, 54, 54, 9, 8, { r: 3, detail: true, phase: 1 });
  for (let i = 0; i < 7; i++) slab('cooling-fin', -23 + i * 7, -21, 3, 42, 17, 5, { tone: 'hi', phase: 1 });
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    const x = side === -1 ? -156 : 113, y = -70 + i * 62;
    const phase = side === -1 ? 0 : 2;
    slab('connector-mount', x, y, 43, 28, 6, 5, { screws: true, phase });
    slab('connector-shell', x + 3, y + 3, 37, 22, 11, 5, { detail: true, phase });
    const pins = Array.from({ length: 5 }, (_, pin) => k.planOutline({ x: x + 8 + pin * 5.5, y: y + 10, w: 2.5, d: 8, r: .4 }, 16.6, P)).join('');
    slab('connector-port', x + 6, y + 7, 31, 14, 16, .6, { tone: 'hi', inner: line(pins, 'hi'), phase });
  }
  return finish('gateway', P, pieces, [{ fixed: 0 }], 'Hub jaringan terbuka dengan enam konektor, prosesor gateway dan jalur streaming yang bergerak. Metafora alur konteks menuju respons.');
}

function modesGeometry() {
  const { P, pieces, slab, line } = instrument('modes');
  for (let row = 0; row < 3; row++) {
    const y = -94 + row * 66;
    slab('magazine-bed', -158, y, 282, 50, 0, 5, { r: 3, screws: true, detail: true });
    for (const edge of [0, 46]) slab('guide-rail', -158, y + edge, 282, 4, 5, 3, { tone: 'lo' });
    for (let col = 0; col < 6; col++) {
      const index = row * 6 + col, x = -150 + col * 45;
      slab('cartridge-socket', x, y + 6, 40, 38, 5, 3, { r: 2, detail: true });
      const contacts = Array.from({ length: 4 }, (_, pin) => k.planOutline({ x: x + 6 + pin * 7, y: y + 12, w: 3, d: 6, r: .3 }, 14, P)).join('');
      slab('template-cartridge', x + 3, y + 9, 34, 31, 8, 6, { r: 2, lift: index, cartridge: index, detail: true, inner: line(contacts, 'lo') });
      slab('cartridge-pull', x + 11, y + 33, 18, 5, 14, 3, { r: 1, lift: index, tone: 'hi' });
    }
  }
  const rules = Array.from({ length: 8 }, (_, i) => k.lineOnTop([139, -23 + i * 8], [158 - (i % 3) * 3, -23 + i * 8], 7.6, P)).join('');
  slab('document-tray', 132, -38, 36, 92, 0, 5, { r: 3, screws: true });
  slab('draft-sheet', 136, -32, 28, 80, 5, 2.6, { r: 1, inner: line(rules, 'lo', { free: true }) });
  const rest = Object.fromEntries(['fixed', ...Array.from({ length: documentationSlots }, (_, i) => 'slot' + i)].map(key => [key, 0]));
  const poses = [rest, { ...rest, ...Object.fromEntries(Array.from({ length: documentationSlots }, (_, i) => ['slot' + i, 12])) }];
  for (let index = 0; index < documentationSlots; index++) for (const height of [6, 12]) poses.push({ ...rest, ['slot' + index]: height });
  return finish('modes', P, pieces, poses, 'Magazin dokumentasi dengan tepat delapan belas cartridge template pada tiga bank, rel pemandu dan baki draf. Cartridge terpilih terangkat untuk ditinjau.');
}

function finish(kind, P, pieces, poses, label) {
  const ordered = orderPrisms(pieces, P, poses);
  const svg = k.figureSvg({ width: 800, height: 500, className: 'capability-anatomy-svg', label, body: ordered.map(piece => piece.svg) });
  const vector = k.axisVector(P, [0, 0, 12]);
  return { kind, svg, count: pieces.length, poses: poses.length, lift: vector, pieces };
}

export function renderCapabilityAnatomy(kind) {
  if (!['gateway', 'modes'].includes(kind)) throw new RangeError('Unknown capability anatomy');
  const result = kind === 'gateway' ? gatewayGeometry() : modesGeometry();
  const count = kind === 'gateway' ? gatewayPhases.length : documentationSlots;
  const title = kind === 'gateway' ? 'Jalur konteks → streaming' : 'Magazin template klinis';
  const initial = kind === 'gateway' ? 'Konteks · 1 / 3' : 'Slot 01 / 18';
  const caption = kind === 'gateway' ? 'Metafora gateway dan streaming SSE / bukan diagram infrastruktur produksi.' : 'Metafora pilihan 18 mode / setiap dokumen tetap berupa draf untuk ditinjau.';
  const html = `<figure class="capability-anatomy" data-feature-anatomy="${kind}" data-feature-count="${count}" data-lift-vector="${result.lift.join(',')}"><div class="feature-anatomy-heading"><span>FIG. ${kind === 'gateway' ? '03' : '06'}</span><span>${title}</span></div><div class="capability-anatomy-stage" tabindex="0" role="group" aria-label="${title}; gunakan panah kiri atau kanan untuk memilih">${result.svg}</div><div class="feature-anatomy-footer"><span data-feature-readout>${initial}</span><div><button type="button" data-feature-step="-1" aria-label="Bagian sebelumnya pada ${title}">←</button><button type="button" data-feature-step="1" aria-label="Bagian berikutnya pada ${title}">→</button></div></div><figcaption>${caption}</figcaption></figure>`;
  return { ...result, html };
}
