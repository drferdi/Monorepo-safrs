import { describe, expect, it } from "vitest";
import { pushMessage, pullMessage, syncFailureMessage } from "../src/lib/sync/messages";

// Every string the doctor reads is Indonesian, sentence case, and says plainly what happened to the documents
// that were NOT sent: a held document stays only in this browser, and that is the part worth knowing.
describe("sync messages", () => {
  it("reports a plain successful push", () => {
    expect(pushMessage({ saved: ["a", "b"], held: [] })).toBe("2 dokumen tersimpan di server.");
  });

  it("uses the singular for one document", () => {
    expect(pushMessage({ saved: ["a"], held: [] })).toBe("1 dokumen tersimpan di server.");
  });

  it("names held documents and says they stay in this browser only", () => {
    const message = pushMessage({ saved: ["a"], held: ["b", "c"] });
    expect(message).toContain("1 dokumen tersimpan di server");
    expect(message).toContain("2 ditahan");
    expect(message).toMatch(/identitas/i);
    expect(message).toContain("hanya di browser ini");
  });

  it("says nothing was sent when every document was held", () => {
    const message = pushMessage({ saved: [], held: ["b"] });
    expect(message).toContain("Tidak ada dokumen yang dikirim");
    expect(message).toContain("1 ditahan");
  });

  it("reports an empty push without pretending something happened", () => {
    expect(pushMessage({ saved: [], held: [] })).toBe("Tidak ada dokumen baru untuk dikirim.");
  });

  it("reports a pull that added documents", () => {
    expect(pullMessage({ added: ["a"], skipped: [], unknownFormat: [] })).toBe("1 dokumen diambil dari server.");
  });

  it("says a skipped document was kept, not replaced", () => {
    const message = pullMessage({ added: [], skipped: ["a", "b"] , unknownFormat: [] });
    expect(message).toContain("2 dokumen sudah ada");
    expect(message).toContain("versi di browser ini dipertahankan");
  });

  it("names documents in a format this version does not know", () => {
    const message = pullMessage({ added: [], skipped: [], unknownFormat: ["a"] });
    expect(message).toContain("1 dokumen memakai format yang belum dikenal");
  });

  it("reports an empty pull", () => {
    expect(pullMessage({ added: [], skipped: [], unknownFormat: [] })).toBe("Tidak ada dokumen di server.");
  });

  it("explains each failure without blaming the doctor", () => {
    expect(syncFailureMessage("unavailable")).toContain("belum aktif");
    expect(syncFailureMessage("signed-out")).toMatch(/masuk/i);
    expect(syncFailureMessage("failed")).toContain("Data lokal tidak berubah");
  });
});
