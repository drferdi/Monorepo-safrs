import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProjectAnswers } from "../src/model.mjs";

const baseInput = {
  name: "Atlas Demo",
  problem: "Membantu tim sekolah mengelola kegiatan belajar.",
  kind: "web",
};

test("normalizes a project into a safe lowercase kebab model", () => {
  const model = normalizeProjectAnswers({
    ...baseInput,
    capabilities: [" AI ", "file storage", "ai"],
    sensitiveDomains: ["Education"],
  });

  assert.deepEqual(model, {
    name: "Atlas Demo",
    slug: "atlas-demo",
    problem: "Membantu tim sekolah mengelola kegiatan belajar.",
    kind: "web",
    capabilities: ["ai", "file-storage"],
    sensitiveDomains: ["education"],
    risk: "R1",
    appBinding: "apps/web",
  });
});

test("rejects unsafe names and slugs before they can become destinations", () => {
  for (const name of [
    "../escape",
    "Atlas/Demo",
    "Atlas\\Demo",
    "%2e%2e",
    "CON",
    ".",
    "..",
  ]) {
    assert.throws(
      () => normalizeProjectAnswers({ ...baseInput, name }),
      /safe project slug/i,
      name,
    );
  }

  assert.throws(
    () => normalizeProjectAnswers({ ...baseInput, slug: "apps/%2fescape" }),
    /safe project slug/i,
  );
});

test("elevates sensitive project choices to R2 and never lowers supplied risk", () => {
  const sensitive = normalizeProjectAnswers({
    ...baseInput,
    capabilities: ["auth", "payments"],
    sensitiveDomains: ["healthcare"],
    risk: "R0",
  });
  const explicitHigherRisk = normalizeProjectAnswers({
    ...baseInput,
    risk: "R3",
  });

  assert.equal(sensitive.risk, "R2");
  assert.equal(explicitHigherRisk.risk, "R3");
});

test("computes R2 from every relevant project field and shared package impact", () => {
  for (const answers of [
    { ...baseInput, name: "Healthcare Atlas", risk: "R0" },
    { ...baseInput, problem: "Memproses payment sekolah", risk: "R0" },
    { ...baseInput, appBinding: "apps/auth-console", risk: "R0" },
    { ...baseInput, sharedPackageImpact: true, risk: "R0" },
  ]) {
    assert.equal(normalizeProjectAnswers(answers).risk, "R2");
  }
});

test("rejects line breaks and control characters in rendered answers", () => {
  for (const answers of [
    { ...baseInput, name: "Atlas\nInjected" },
    { ...baseInput, problem: "Aman\rTidak" },
    { ...baseInput, capabilities: ["ai\u0000hidden"] },
    { ...baseInput, sensitiveDomains: ["government\tdata"] },
  ]) {
    assert.throws(
      () => normalizeProjectAnswers(answers),
      /control characters/i,
    );
  }
});

test("uses only bounded app bindings", () => {
  assert.equal(
    normalizeProjectAnswers({ ...baseInput, kind: "desktop" }).appBinding,
    "apps/desktop",
  );
  assert.equal(
    normalizeProjectAnswers({ ...baseInput, appBinding: "apps/atlas-client" })
      .appBinding,
    "apps/atlas-client",
  );
  assert.throws(
    () =>
      normalizeProjectAnswers({ ...baseInput, appBinding: "../packages/api" }),
    /bounded app binding/i,
  );
});
