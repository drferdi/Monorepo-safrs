import * as k from './vendor/anatomy-kit.mjs';
import { anatomyLayers, anatomyTargets, anatomyAssembly } from '../assets/system-anatomy-model.js';

// Physical computing-device metaphor, not a representation of deployed software internals.
// Parts: 4 feet, unibody base, PCB, 3 input layers, 6 input contacts, processor socket,
// 24 processor pins, package and core, memory carrier, 8 memory chips, 8 contacts,
// 3 document display layers, manual review control and 4 edge ports.
// Ray intersections order the actual occupied volumes, including the large bedplate.
// Sorting centres alone would paint that plate over instruments behind its centre.
export function orderPrisms(pieces, P, poses) {
  const { sinA, cosA, sinE, cosE, k: scale } = k.cameraOf(P);
  const view = [cosA * cosE, sinA * cosE, sinE];
  function front(piece, sx, sy) {
    const u = (sx - P.origin[0]) / scale, v = (sy - P.origin[1]) / scale;
    const start = [u * sinA + v * cosA * sinE, -u * cosA + v * sinA * sinE, -v * cosE];
    let enter = -Infinity, exit = Infinity;
    for (let axis = 0; axis < 3; axis++) {
      enter = Math.max(enter, (piece.min[axis] - start[axis]) / view[axis]);
      exit = Math.min(exit, (piece.max[axis] - start[axis]) / view[axis]);
    }
    return exit > enter + .01 ? exit : null;
  }
  const edges = pieces.map(() => new Set()), incoming = pieces.map(() => 0);
  for (const pose of poses) {
  const placed = pieces.map(piece => {
    const lift = pose[piece.assembly], shift = -lift * cosE * scale;
    return { ...piece, min: [piece.min[0], piece.min[1], piece.min[2] + lift], max: [piece.max[0], piece.max[1], piece.max[2] + lift], box: [piece.box[0], piece.box[1] + shift, piece.box[2], piece.box[3] + shift] };
  });
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const a = placed[i], b = placed[j];
    const left = Math.max(a.box[0], b.box[0]), right = Math.min(a.box[2], b.box[2]);
    const top = Math.max(a.box[1], b.box[1]), bottom = Math.min(a.box[3], b.box[3]);
    if (right <= left || bottom <= top) continue;
    let direction = 0;
    for (let y = top + .2; y < bottom; y += Math.max(.45, (bottom - top) / 16)) {
      for (let x = left + .2; x < right; x += Math.max(.45, (right - left) / 16)) {
        const af = front(a, x, y), bf = front(b, x, y);
        if (af === null || bf === null || Math.abs(af - bf) < .02) continue;
        const next = af < bf ? 1 : -1;
        if (direction && next !== direction) throw new Error(`Anatomy parts interlock: ${a.name}, ${b.name}`);
        direction = next;
      }
    }
    if (direction) {
      const from = direction === 1 ? i : j, to = direction === 1 ? j : i;
      if (!edges[from].has(to)) { edges[from].add(to); incoming[to]++; }
    }
  }
  }
  const ready = pieces.map((_, i) => i).filter(i => !incoming[i]), ordered = [];
  while (ready.length) {
    ready.sort((a, b) => pieces[b].depth - pieces[a].depth);
    const index = ready.pop();
    ordered.push(pieces[index]);
    for (const next of edges[index]) if (--incoming[next] === 0) ready.push(next);
  }
  if (ordered.length !== pieces.length) throw new Error('Anatomy depth order needs a split assembly');
  return ordered;
}

export function renderSystemAnatomy() {
  const base = { x: -270, y: -135, w: 540, d: 270, r: 5 };
  const P = k.fitProjection(k.boxCorners(base, -14, 150), 1120, 700, { pad: 60, azimuth: 48, elevation: 35 });
  const overview = anatomyTargets(null);
  const pieces = [];
  let count = 0;
  const line = (d, tone = 'faint', free) => k.lineSvg(d, { tone, free });
  function slab(name, x, y, w, d, z, h, options = {}) {
    const plan = { x, y, w, d, r: options.r ?? 1 };
    const detail = options.detail ? line(k.planOutline(k.insetPlan(plan, 2.5), z + h, P), 'lo') : '';
    const screws = options.screws ? k.dotsSvg(k.corners(plan, 4).map(([a, b]) => k.iso([a, b, z + h], P)), { size: .65, tone: 'hi' }) : '';
    const svg = k.solidSvg(k.slabOf(plan, z, h, P, 4, .55), { tone: options.tone ?? 'mid', inner: detail + screws });
    const points = k.boxCorners(plan, z, z + h).map(point => k.iso(point, P));
    const assembly = anatomyAssembly(name), lift = overview[assembly];
    pieces.push({ name, assembly, min: [x, y, z], max: [x + w, y + d, z + h], box: [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))], depth: k.depthOf([x + w / 2, y + d / 2, z + h / 2], P), svg: `<g data-component="${name}" data-anatomy-assembly="${assembly}" transform="${k.translateAlong(P, [0, 0, lift])}"${options.stage !== undefined ? ` data-anatomy-stage="${options.stage}"` : ''}>${svg}${options.extra ?? ''}</g>` });
    count++;
  }
  for (const [x, y] of k.corners(base, 22)) slab('foot', x - 7, y - 7, 14, 14, -14, 6, { tone: 'lo' });
  slab('unibody-base', base.x, base.y, base.w, base.d, -8, 8, { r: 8, detail: true, screws: true, tone: 'lo' });
  const routes = [
    [[-95, 18], [-72, 18], [-72, -10], [-59, -10]],
    [[59, -10], [80, -10], [80, 38], [100, 38]],
    [[114, -78], [80, -78], [80, -32], [59, -32]]
  ];
  const traces = routes.map(points => {
    const d = k.onTop(points, 1, P);
    return line(d, 'lo') + k.lineSvg(d, { tone: 'lit', className: 'anatomy-data-trace' });
  }).join('');
  const terminals = k.dotsSvg(routes.flatMap(points => [points[0], points[points.length - 1]]).map(([x, y]) => k.iso([x, y, 1], P)), { size: 1, tone: 'hi' });
  slab('system-board', -253, -118, 506, 236, 0, 1, { r: 5, detail: true, extra: traces + terminals });
  // Thin glass encounter panel, with its connector and screen on a real unibody mount.
  slab('input-mount', -239, -56, 148, 104, 1, 3, { screws: true });
  slab('input-bezel', -239, -56, 148, 104, 4, 3, { r: 5, tone: 'hi' });
  const inputRules = Array.from({ length: 6 }, (_, i) => k.lineOnTop([-219, -33 + i * 10], [-128 + (i % 3) * 9, -33 + i * 10], 7.5, P)).join('');
  slab('input-glass', -232, -49, 134, 90, 7, .5, { r: 3, stage: 0, tone: 'hi', extra: line(inputRules, 'lo', true) });
  for (let i = 0; i < 6; i++) slab('input-contact', -91, -30 + i * 10, 8, 3, 1, 1);
  // Processor and contact array; the hardware is a visual metaphor, not a claim about deployment.
  slab('processor-socket', -59, -61, 118, 118, 1, 4, { r: 4, screws: true, detail: true });
  for (let i = 0; i < 6; i++) {
    const offset = -44 + i * 16;
    slab('processor-pin', offset, -56, 7, 10, 5, 1);
    slab('processor-pin', offset, 42, 7, 10, 5, 1);
    slab('processor-pin', -54, offset, 10, 7, 5, 1);
    slab('processor-pin', 44, offset, 10, 7, 5, 1);
  }
  slab('processor-package', -39, -41, 78, 78, 5, 3, { r: 3, tone: 'hi', detail: true });
  slab('processor-core', -30, -32, 60, 60, 8, 1.2, { stage: 1, tone: 'hi', detail: true });
  // Solid-state reference module with eight mounted chips and edge contacts.
  slab('memory-carrier', 111, -105, 124, 66, 1, 3, { r: 3, screws: true });
  for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
    slab('memory-chip', 123 + col * 27, -96 + row * 25, 18, 17, 4, 2, { r: 1, stage: row === 0 && col === 0 ? 2 : undefined, tone: 'hi' });
  }
  for (let i = 0; i < 8; i++) slab('memory-contact', 125 + i * 12, -44, 5, 5, 4, .5);
  // A flush document display and a distinct review control at the edge of the device.
  slab('document-mount', 100, 16, 140, 95, 1, 3, { r: 4, screws: true });
  slab('document-bezel', 100, 16, 140, 95, 4, 3, { r: 5, tone: 'hi' });
  const documentRules = Array.from({ length: 7 }, (_, i) => k.lineOnTop([116, 31 + i * 9], [219 - (i % 3) * 14, 31 + i * 9], 7.5, P)).join('');
  slab('document-glass', 107, 23, 126, 81, 7, .5, { r: 3, stage: 3, tone: 'hi', extra: line(documentRules, 'lo', true) });
  slab('review-control', 39, 87, 36, 17, 1, 2, { r: 3, detail: true });
  for (let i = 0; i < 4; i++) slab('port', -70 + i * 22, 135, 14, 6, -4, 3, { tone: 'hi' });
  const endpoints = [overview, ...[0, 1, 2, 3].map(anatomyTargets)];
  const poses = [...endpoints];
  for (let i = 0; i < endpoints.length; i++) for (let j = i + 1; j < endpoints.length; j++) {
    for (const share of [.25, .5, .75]) poses.push(Object.fromEntries(anatomyLayers.map(layer => [layer.id, endpoints[i][layer.id] + (endpoints[j][layer.id] - endpoints[i][layer.id]) * share])));
  }
  const ordered = orderPrisms(pieces, P, poses);
  const svg = k.figureSvg({ width: 1120, height: 700, className: 'system-anatomy-svg', label: 'Anatomi perangkat komputasi berlapis: panel konteks, prosesor, modul pengetahuan solid-state, dan kanvas dokumen. Pilih fitur untuk memusatkan modul terkait; keputusan tetap pada dokter.', body: ordered.map(item => item.svg) });
  return { svg, count, projection: P };
}
