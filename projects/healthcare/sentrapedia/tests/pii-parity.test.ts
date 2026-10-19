import { describe, expect, it } from "vitest";
import { containsIdentity } from "../src/lib/mira/contract";
import parity from "./fixtures/pii-parity.json";

// mira/service/tests/test_components.py reads the same rows for the engine's side.
describe("PII parity between the client and the engine", () => {
  it("blocks exactly the rows marked for the client", () => {
    for (const row of parity.cases) expect([row.text, containsIdentity(row.text)]).toEqual([row.text, row.client]);
  });
  it("never lets the engine refuse what the client passed", () => {
    expect(parity.cases.filter(row => row.engine && !row.client)).toEqual([]);
  });
});
