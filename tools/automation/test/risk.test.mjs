import assert from "node:assert/strict";
import test from "node:test";

import { compareRisk, computeEffectiveRisk, maxRisk } from "../src/risk.mjs";

test("risk ordering is R0 < R1 < R2 < R3", () => {
  assert.equal(compareRisk("R0", "R1") < 0, true);
  assert.equal(compareRisk("R3", "R2") > 0, true);
  assert.equal(compareRisk("R1", "R1"), 0);
  assert.equal(maxRisk(["R0", "R2", "R1"]), "R2");
});

test("effective risk is the maximum of every contributing dimension", () => {
  const { risk, reasons } = computeEffectiveRisk({
    declared: "R1",
    dimensions: {
      path: { risk: "R2", reason: "write scope touches .safrs/**" },
      operation: { risk: "R1", reason: "repo.modify_scoped" },
      data: { risk: "R0", reason: "public data" },
    },
  });
  assert.equal(risk, "R2");
  assert.equal(
    reasons.some((entry) => /\.safrs/u.test(entry)),
    true,
  );
});

test("declared risk can raise but never lower the result", () => {
  const raised = computeEffectiveRisk({
    declared: "R3",
    dimensions: { path: { risk: "R1", reason: "plain source file" } },
  });
  assert.equal(raised.risk, "R3");

  const floored = computeEffectiveRisk({
    declared: "R0",
    dimensions: { path: { risk: "R2", reason: "sensitive path" } },
  });
  assert.equal(floored.risk, "R2");
});

test("reasons are mandatory above R0 and invalid risks fail closed", () => {
  const result = computeEffectiveRisk({
    declared: "R0",
    dimensions: {},
  });
  assert.equal(result.risk, "R0");
  assert.deepEqual(result.reasons, []);

  assert.throws(
    () =>
      computeEffectiveRisk({
        declared: "R1",
        dimensions: { path: { risk: "R2", reason: "" } },
      }),
    /reason/iu,
  );
  assert.throws(
    () =>
      computeEffectiveRisk({
        declared: "R9",
        dimensions: {},
      }),
    /risk/iu,
  );
});
