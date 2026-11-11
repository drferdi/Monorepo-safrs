import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Gerbang batas arsitektur (keputusan Chief G03, 2026-08-26).
 *
 * Technical Bible bagian 44 mendefinisikan empat paket dengan tanggung jawab
 * terpisah. Kontrak capsule standalone menolak setiap symlink di pohon capsule,
 * dan dependensi workspace:* menghasilkan symlink — jadi paket fisik diganti
 * modul sumber yang terpisah tegas. Pengemasan beradaptasi; tanggung jawab
 * tidak boleh runtuh.
 *
 * Prosa tidak menghentikan apa pun. Berkas inilah yang menghentikannya: ia
 * membaca pernyataan import yang benar-benar ada dan gagal pada pelanggaran
 * pertama.
 *
 * Aturan ditulis sebagai ALLOWLIST, bukan denylist. Denylist menua diam-diam
 * setiap kali dependensi baru muncul; allowlist tidak bisa.
 */

const MODULES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/modules",
);

interface ModuleRule {
  /** Paket npm yang boleh diimpor. Pola berakhiran /* mencocokkan subpath. */
  readonly allowedPackages: readonly string[];
  /** Modul saudara yang boleh diimpor. */
  readonly allowedModules: readonly string[];
  /** Keluarga yang oleh keputusan Chief secara eksplisit tidak boleh muncul. */
  readonly explicitlyForbidden: readonly string[];
}

const RULES: Record<string, ModuleRule> = {
  "historical-domain": {
    allowedPackages: ["zod"],
    allowedModules: [],
    explicitlyForbidden: [
      "react",
      "react-dom",
      "next",
      "payload",
      "@payloadcms/db-postgres",
      "@payloadcms/next",
      "gsap",
      "@gsap/react",
      "pg",
      "drizzle-orm",
    ],
  },
  "content-validation": {
    allowedPackages: ["zod"],
    allowedModules: ["historical-domain"],
    explicitlyForbidden: [
      "react",
      "react-dom",
      "next",
      "gsap",
      "@gsap/react",
      "payload",
      "@payloadcms/db-postgres",
      "@payloadcms/next",
      "pg",
      "drizzle-orm",
    ],
  },
  "design-system": {
    allowedPackages: ["react", "react-dom", "react/jsx-runtime"],
    allowedModules: [],
    explicitlyForbidden: [
      "payload",
      "@payloadcms/db-postgres",
      "@payloadcms/next",
      "pg",
      "drizzle-orm",
    ],
  },
  motion: {
    allowedPackages: ["gsap", "gsap/*", "@gsap/react", "react", "react-dom"],
    allowedModules: [],
    explicitlyForbidden: [
      "payload",
      "@payloadcms/db-postgres",
      "@payloadcms/next",
      "pg",
      "drizzle-orm",
    ],
  },
};

/** Direktori aplikasi yang tidak boleh dijangkau balik oleh modul mana pun. */
const APPLICATION_DIRECTORIES = ["app", "components", "content", "payload"];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

function listSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...listSourceFiles(target));
    else if (SOURCE_EXTENSIONS.has(path.extname(target))) found.push(target);
  }
  return found;
}

function listModuleNames(): string[] {
  return readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Mengambil setiap specifier import: statis, side-effect, re-export, dinamis,
 * dan require. Komentar baris dan blok dibuang lebih dulu supaya contoh di
 * dalam dokumentasi tidak dihitung sebagai import nyata.
 */
function extractImportSpecifiers(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  const specifiers = new Set<string>();
  for (const pattern of patterns) {
    for (const match of withoutComments.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

function packageNameOf(specifier: string): string {
  const segments = specifier.split("/");
  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
}

function packageAllowed(
  specifier: string,
  allowed: readonly string[],
): boolean {
  return allowed.some((pattern) =>
    pattern.endsWith("/*")
      ? specifier === pattern.slice(0, -2) ||
        specifier.startsWith(pattern.slice(0, -1))
      : specifier === pattern,
  );
}

interface Violation {
  readonly file: string;
  readonly specifier: string;
  readonly reason: string;
}

function auditModule(moduleName: string, rule: ModuleRule): Violation[] {
  const moduleDirectory = path.join(MODULES_DIR, moduleName);
  const violations: Violation[] = [];

  for (const file of listSourceFiles(moduleDirectory)) {
    const relativeFile = path
      .relative(MODULES_DIR, file)
      .split(path.sep)
      .join("/");
    const source = readFileSync(file, "utf8");

    for (const specifier of extractImportSpecifiers(source)) {
      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(file), specifier);
        const withinModules = path.relative(MODULES_DIR, resolved);

        if (withinModules.startsWith("..") || path.isAbsolute(withinModules)) {
          violations.push({
            file: relativeFile,
            specifier,
            reason:
              "reaches outside src/modules — modules never import application code",
          });
          continue;
        }

        const targetModule = withinModules.split(path.sep)[0];
        if (targetModule && targetModule !== moduleName) {
          if (!rule.allowedModules.includes(targetModule)) {
            violations.push({
              file: relativeFile,
              specifier,
              reason: `${moduleName} may not depend on module ${targetModule}`,
            });
          }
        }
        continue;
      }

      // Alias yang menunjuk ke kode aplikasi.
      if (specifier.startsWith("@/") || specifier === "@payload-config") {
        const aliasTarget = specifier.replace(/^@\//, "").split("/")[0] ?? "";
        if (
          specifier === "@payload-config" ||
          APPLICATION_DIRECTORIES.includes(aliasTarget)
        ) {
          violations.push({
            file: relativeFile,
            specifier,
            reason: "modules never import application code",
          });
          continue;
        }
      }

      if (specifier.startsWith("node:")) {
        violations.push({
          file: relativeFile,
          specifier,
          reason: `${moduleName} may not depend on Node built-ins`,
        });
        continue;
      }

      if (!packageAllowed(specifier, rule.allowedPackages)) {
        violations.push({
          file: relativeFile,
          specifier,
          reason: `package ${packageNameOf(specifier)} is not on the allowlist for ${moduleName}`,
        });
      }
    }
  }

  return violations;
}

describe("module boundaries", () => {
  it("has a rule for every module directory, and no rule without a directory", () => {
    // Tanpa uji ini, modul baru bisa muncul tanpa aturan dan lolos diam-diam.
    expect(listModuleNames()).toEqual(Object.keys(RULES).sort());
  });

  it("every module directory really exists", () => {
    for (const moduleName of Object.keys(RULES)) {
      const target = path.join(MODULES_DIR, moduleName);
      expect(statSync(target).isDirectory()).toBe(true);
    }
  });

  for (const [moduleName, rule] of Object.entries(RULES)) {
    it(`${moduleName} imports only what its rule allows`, () => {
      const violations = auditModule(moduleName, rule);
      const rendered = violations
        .map((v) => `  ${v.file}: "${v.specifier}" — ${v.reason}`)
        .join("\n");
      expect(rendered, `\n${rendered}\n`).toBe("");
    });

    it(`${moduleName} rejects each explicitly forbidden dependency`, () => {
      // Menegaskan larangan yang Chief sebutkan langsung, supaya aturan G03
      // tetap terbaca di dalam kode dan bukan hanya tersirat dari allowlist.
      for (const forbidden of rule.explicitlyForbidden) {
        expect(
          packageAllowed(forbidden, rule.allowedPackages),
          `${moduleName} must not allow ${forbidden}`,
        ).toBe(false);
      }
    });
  }
});
