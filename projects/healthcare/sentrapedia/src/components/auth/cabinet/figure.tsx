import "../../../lib/anatomy/iso.css";
import "./cabinet.css";
import { CabinetArt } from "./art";
import { DRAWERS, ENTRIES } from "./layout";
import { CabinetMotion } from "./motion";

/** The cabinet beside the admission card. Decorative: the form is the page, so none of this is announced or focusable. */
export function CabinetFigure() {
  return (
    <figure className="iso auth-figure" data-theme="light" aria-hidden="true">
      <CabinetArt />
      <figcaption>
        <span className="auth-figure-readout" data-cabinet-readout="">
          {DRAWERS.length} laci · {ENTRIES} entri penyakit
        </span>
        <span className="auth-figure-note">Lemari kartu indeks pengetahuan Sentrapedia: satu laci untuk tiap kategori, satu kartu untuk tiap delapan entri.</span>
      </figcaption>
      <CabinetMotion />
    </figure>
  );
}
