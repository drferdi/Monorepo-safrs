import { describe, expect, it } from "vitest";
import { createDemoInputSchema } from "./demo.js";

describe("createDemoInputSchema", () => {
  it("rejects an empty name", () => {
    expect(createDemoInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("normalizes a valid name", () => {
    expect(createDemoInputSchema.parse({ name: "  Atlas  " })).toEqual({
      name: "Atlas",
    });
  });
});
