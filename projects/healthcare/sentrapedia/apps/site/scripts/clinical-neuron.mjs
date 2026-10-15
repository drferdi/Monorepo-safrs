import { axons, axonPath, dendrites, terminals, soma, neuronDefs } from '../assets/clinical-neuron-artwork.mjs';

export function renderClinicalNeuron() {
  const branches = paths => paths.map(({ d, width }) => '<path class="clinical-dendrite" d="' + d + '" style="stroke-width:' + width + '"/>').join('');
  const groups = axons.map((points, i) => {
    const d = axonPath(points);
    return '<g class="clinical-neuron clinical-neuron-' + i + '"><path class="clinical-axon" d="' + d + '"/><path class="clinical-sheath" d="' + d + '"/><path class="clinical-fiber-light" d="' + d + '"/>' +
      (i === 0 ? branches(dendrites) + '<path class="clinical-soma" d="' + soma + '"/><circle class="clinical-nucleus" cx="430" cy="100" r="4.5"/>' : '') +
      (i === 5 ? branches(terminals) : '') + '</g>';
  }).join('');
  return '<svg viewBox="0 0 560 680" role="img" aria-labelledby="clinical-network-title clinical-network-desc"><title id="clinical-network-title">Neuron berbentuk S, dari anamnesis hingga keputusan akhir</title><desc id="clinical-network-desc">Dendrit, badan sel, serabut berbentuk S, dan ujung percabangan menggambarkan enam tahap penalaran. Impuls mengikuti scroll. Dokter menentukan terapi, rawat jalan, rawat inap, atau rujukan. Kondisi gawat ditangani sejak awal. Ini metafora visual, bukan simulasi biologis atau urutan wajib untuk setiap pasien.</desc><defs>' + neuronDefs + '</defs>' + groups +
    '<g class="clinical-impulse" aria-hidden="true"><circle class="clinical-impulse-halo" r="10"/>' + [3.2, 2.8, 2.3, 1.8, 1.2].map((r, i) => '<circle class="clinical-signal" r="' + r + '" opacity="' + (1 - i * .2) + '"/>').join('') + '</g></svg>';
}
