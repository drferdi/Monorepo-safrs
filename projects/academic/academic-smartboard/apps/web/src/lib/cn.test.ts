import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("menggabung class dan buang duplikat tailwind", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
  it("mengabaikan value falsy", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
