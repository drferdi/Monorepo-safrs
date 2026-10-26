import "../../../lib/anatomy/iso.css";
import "./tesseract.css";
import { TesseractArt } from "./art";
import { TESSERACT } from "./layout";
import { TesseractMotion } from "./motion";

/** The cabinet beside the admission card. Decorative: the form is the page, so none of this is announced or focusable. */
export function TesseractFigure() {
  return (
    <figure className="iso auth-figure" data-theme="light" aria-hidden="true">
      <TesseractArt />
      <figcaption>
        <span className="auth-figure-readout" data-tesseract-readout="">
          {TESSERACT.cells} sel · {TESSERACT.squares} sisi · {TESSERACT.edges} rusuk · {TESSERACT.vertices} titik sudut
        </span>
        <span className="auth-figure-note">Delapan sel kubus dalam jaring tesseract. Sel 3 tersembunyi di inti.</span>
      </figcaption>
      <TesseractMotion />
    </figure>
  );
}
