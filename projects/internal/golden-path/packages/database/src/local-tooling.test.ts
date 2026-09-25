import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveLocalToolingDatabaseUrl } from "./local-tooling.js";

const temporaryRoots: string[] = [];

function createWorkspaceRoot(files: Record<string, string>) {
  const rootDirectory = mkdtempSync(join(tmpdir(), "safrs-database-"));
  temporaryRoots.push(rootDirectory);

  for (const [relativePath, contents] of Object.entries(files)) {
    writeFileSync(join(rootDirectory, relativePath), contents);
  }

  return rootDirectory;
}

afterEach(() => {
  for (const rootDirectory of temporaryRoots.splice(0)) {
    rmSync(rootDirectory, { force: true, recursive: true });
  }
});

describe("resolveLocalToolingDatabaseUrl", () => {
  it("uses the declared local URL from .env.example when .env is absent", () => {
    const rootDirectory = createWorkspaceRoot({
      ".env.example":
        "DATABASE_URL=postgresql://safrs:safrs@127.0.0.1:54329/safrs_local\n",
    });

    expect(resolveLocalToolingDatabaseUrl({}, rootDirectory)).toBe(
      "postgresql://safrs:safrs@127.0.0.1:54329/safrs_local",
    );
  });

  it("rejects an explicit unsafe URL instead of falling back", () => {
    const rootDirectory = createWorkspaceRoot({
      ".env.example":
        "DATABASE_URL=postgresql://safrs:safrs@127.0.0.1:54329/safrs_local\n",
    });

    expect(() =>
      resolveLocalToolingDatabaseUrl(
        { DATABASE_URL: "postgresql://x:x@db.example.com/production" },
        rootDirectory,
      ),
    ).toThrow(/^\[DATABASE\] RESET DITOLAK/);
  });

  it("returns an explicit guarded local URL without normalization", () => {
    const rootDirectory = createWorkspaceRoot({
      ".env.example":
        "DATABASE_URL=postgresql://safrs:safrs@127.0.0.1:54329/safrs_local\n",
    });
    const databaseUrl =
      "postgresql://safrs:local-password@127.0.0.1:54329/safrs_local";

    expect(
      resolveLocalToolingDatabaseUrl(
        { DATABASE_URL: databaseUrl },
        rootDirectory,
      ),
    ).toBe(databaseUrl);
  });

  it("rejects a present .env that does not declare DATABASE_URL", () => {
    const rootDirectory = createWorkspaceRoot({
      ".env": "NODE_ENV=development\n",
      ".env.example":
        "DATABASE_URL=postgresql://safrs:safrs@127.0.0.1:54329/safrs_local\n",
    });

    expect(() => resolveLocalToolingDatabaseUrl({}, rootDirectory)).toThrow(
      /^\[DATABASE\] LOCAL TOOLING DITOLAK/,
    );
  });

  it("keeps generated Prisma sources outside the root Biome scope", () => {
    const rootBiomeConfig = resolve(
      import.meta.dirname,
      "../../../biome.jsonc",
    );

    expect(existsSync(rootBiomeConfig)).toBe(true);
    expect(readFileSync(rootBiomeConfig, "utf8")).toContain(
      "!!packages/database/src/generated/prisma",
    );
    expect(readFileSync(rootBiomeConfig, "utf8")).not.toContain(
      '!!packages/database/src/generated"',
    );
  });

  it("keeps authored generated siblings visible to Biome", () => {
    const rootDirectory = resolve(import.meta.dirname, "../../..");
    const biomeCli = join(
      rootDirectory,
      "node_modules/@biomejs/biome/bin/biome",
    );
    const result = spawnSync(
      process.execPath,
      [
        biomeCli,
        "lint",
        "--write",
        "--unsafe",
        "--stdin-file-path",
        "packages/database/src/generated/authored-sibling.ts",
      ],
      { cwd: rootDirectory, encoding: "utf8", input: "const unused = 1;\n" },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("const _unused = 1;");
  });

  it("runs Prisma generate from the declared local fallback without DATABASE_URL", () => {
    const { APP_URL, DATABASE_URL, NODE_ENV, ...environmentWithoutDatabase } =
      process.env;
    const runner = resolve(
      import.meta.dirname,
      "../scripts/run-local-prisma.mjs",
    );
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", runner, "generate"],
      {
        cwd: resolve(import.meta.dirname, "../../.."),
        encoding: "utf8",
        env: environmentWithoutDatabase,
      },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).not.toContain("DEP0190");
  });
});
