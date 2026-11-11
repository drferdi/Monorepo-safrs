import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Rute yang membaca CMS dirender saat request (keputusan Chief 2026-09-25).
 *
 * Build tidak boleh membutuhkan database: setiap berkas di `src/app` yang
 * mengimpor `content/queries` harus berada di bawah segmen yang menyatakan
 * `dynamic = "force-dynamic"`, di berkas itu sendiri atau di layout leluhurnya.
 * Beban database ditahan oleh cache data di `content/queries.ts`.
 */

const APP_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/app",
);

const FORCE_DYNAMIC = /export const dynamic = "force-dynamic";/;
const IMPORTS_QUERIES = /from "[./]*content\/queries"/;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

function declaresForceDynamic(file: string): boolean {
  if (FORCE_DYNAMIC.test(readFileSync(file, "utf8"))) return true;
  for (let dir = path.dirname(file); dir.startsWith(APP_DIR); ) {
    for (const name of ["layout.tsx", "layout.ts"]) {
      const layout = path.join(dir, name);
      if (
        existsSync(layout) &&
        FORCE_DYNAMIC.test(readFileSync(layout, "utf8"))
      )
        return true;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

describe("rute pembaca CMS dirender saat request", () => {
  const readers = listSourceFiles(APP_DIR).filter((file) =>
    IMPORTS_QUERIES.test(readFileSync(file, "utf8")),
  );

  it("menemukan rute yang membaca CMS", () => {
    expect(readers.length).toBeGreaterThan(0);
  });

  it.each(readers.map((file) => [path.relative(APP_DIR, file), file]))(
    "%s tidak diprerender saat build",
    (_relative, file) => {
      expect(declaresForceDynamic(file)).toBe(true);
    },
  );
});
