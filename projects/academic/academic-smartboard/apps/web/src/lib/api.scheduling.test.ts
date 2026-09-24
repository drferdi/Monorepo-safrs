import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildQuery, listCurriculumOutcomes, listSessions } from "./api";

vi.mock("axios", () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {},
  };
  return { default: { create: vi.fn(() => instance) } };
});

const mockedInstance = (
  axios.create as unknown as () => {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  }
)();

describe("buildQuery", () => {
  it("menghilangkan kunci kosong dan meng-encode nilai", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ status: "terjadwal", q: "" })).toBe(
      "?status=terjadwal",
    );
    expect(buildQuery({ q: "a b", phase: "A" })).toBe("?q=a%20b&phase=A");
    expect(buildQuery({ a: null, b: undefined, c: "x" })).toBe("?c=x");
  });
});

describe("listSessions / listCurriculumOutcomes query", () => {
  beforeEach(() => {
    mockedInstance.get.mockReset();
  });

  it("listSessions menambahkan query string filter", async () => {
    mockedInstance.get.mockResolvedValueOnce({ data: [] });
    await listSessions({ status: "berlangsung", date_from: "2026-08-01" });
    expect(mockedInstance.get).toHaveBeenCalledWith(
      "/sessions?status=berlangsung&date_from=2026-08-01",
    );
  });

  it("listCurriculumOutcomes menambahkan query string filter", async () => {
    mockedInstance.get.mockResolvedValueOnce({ data: { items: [] } });
    await listCurriculumOutcomes({ phase: "A", subject: "Matematika" });
    expect(mockedInstance.get).toHaveBeenCalledWith(
      "/curriculum/outcomes?phase=A&subject=Matematika",
    );
  });
});
