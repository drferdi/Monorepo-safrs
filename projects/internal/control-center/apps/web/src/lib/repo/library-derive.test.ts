import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveCounts } from "./library-derive.ts";

test("data korpus absen: readyToUse null dengan alasan, bukan angka manifest", () => {
  const derived = deriveCounts({
    entries: 4,
    readyCount: 3,
    sourcePdfs: 0,
    canonicalDocuments: 0,
  });
  assert.equal(derived.dataMissingHere, true);
  assert.equal(derived.canonicalDocuments, null);
  assert.equal(derived.readyToUse, null);
  assert.match(derived.readyUnknownReason ?? "", /tidak ada di checkout ini/);
});

test("manifest tertinggal dari disk: readyToUse null dengan alasan sensus", () => {
  const derived = deriveCounts({
    entries: 4,
    readyCount: 3,
    sourcePdfs: 90,
    canonicalDocuments: 82,
  });
  assert.equal(derived.readyToUse, null);
  assert.equal(derived.unrecorded, 78);
  assert.match(derived.readyUnknownReason ?? "", /pgvector/);
});

test("manifest sinkron dengan disk: readyToUse dilaporkan apa adanya", () => {
  const derived = deriveCounts({
    entries: 4,
    readyCount: 3,
    sourcePdfs: 4,
    canonicalDocuments: 4,
  });
  assert.equal(derived.readyToUse, 3);
  assert.equal(derived.readyUnknownReason, null);
  assert.equal(derived.notYetParsed, 0);
});
