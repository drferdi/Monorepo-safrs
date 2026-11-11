import { PixelLoader } from "../components/pixel-loader";

export default function Loading() {
  return <main className="system-loading" aria-busy="true"><PixelLoader label="Sedang memuat Sentrapedia…"/><p>Memuat Sentrapedia…</p></main>;
}
