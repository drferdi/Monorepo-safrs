import { describe, expect, it } from "vitest";
import {
  getPersonaById,
  getPersonasByCategory,
  PERSONA_CATEGORY,
  SENTRABOT_PERSONAS,
} from "./index.ts";

describe("SENTRABOT_PERSONAS", () => {
  it("should expose at least ten Indonesian assistant personas", () => {
    expect(SENTRABOT_PERSONAS.length).toBeGreaterThanOrEqual(10);
  });

  it("should use unique ids and non-empty instructions in Bahasa Indonesia", () => {
    const ids = new Set<string>();
    for (const persona of SENTRABOT_PERSONAS) {
      expect(ids.has(persona.id)).toBe(false);
      ids.add(persona.id);
      expect(persona.instructions.length).toBeGreaterThan(100);
      expect(persona.instructions).toMatch(/Bahasa Indonesia|Indonesia/);
      expect(persona.timezone).toBe("Asia/Jakarta");
    }
  });

  it("should resolve personas by id and category", () => {
    expect(getPersonaById("sekretaris-pribadi")?.name).toBe(
      "Sekretaris Pribadi",
    );
    expect(
      getPersonasByCategory(PERSONA_CATEGORY.BISNIS).length,
    ).toBeGreaterThan(3);
  });
});
