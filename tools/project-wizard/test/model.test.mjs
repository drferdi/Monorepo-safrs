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
