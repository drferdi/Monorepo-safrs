import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { editorialPreviewAssetNames } from "../../../../content/production-narrative";

/**
 * Media komposisi editorial hanya tersedia pada server pengembangan lokal.
 * Build produksi tetap memuat route ini, tetapi selalu menjawab 404 dan tidak
 * pernah mengekspos berkas yang belum melewati rights/provenance CMS.
 *
 * Daftar putihnya diturunkan dari naskah produksi (satu sumber kebenaran),
 * sehingga menambah slot siap tidak butuh sinkronisasi tangan di sini.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const { filename } = await context.params;
  if (!editorialPreviewAssetNames().has(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  const assetPath = path.join(
    process.cwd(),
    "editorial-preview",
    "journey",
    filename,
  );
  const body = await readFile(assetPath);
  return new NextResponse(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/webp",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
