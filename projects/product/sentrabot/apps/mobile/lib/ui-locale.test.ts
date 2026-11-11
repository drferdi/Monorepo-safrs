import { describe, expect, it } from "vitest";
import { isUiLocale, resolveUiLocale } from "./ui-locale";

describe("mobile ui locale", () => {
  it("recognises only supported locales", () => {
    expect(isUiLocale("en")).toBe(true);
    expect(isUiLocale("id")).toBe(true);
    expect(isUiLocale("fr")).toBe(false);
    expect(isUiLocale(null)).toBe(false);
    expect(isUiLocale(42)).toBe(false);
  });

  it("prefers the saved choice", () => {
    expect(resolveUiLocale({ saved: "en", deviceLanguage: "id-ID" })).toBe("en");
  });

  it("ignores a saved value that is not supported", () => {
    expect(resolveUiLocale({ saved: "klingon", deviceLanguage: "en-US" })).toBe("en");
  });

  it("takes the primary subtag of the device language", () => {
    expect(resolveUiLocale({ deviceLanguage: "en-US" })).toBe("en");
    expect(resolveUiLocale({ deviceLanguage: "id-ID" })).toBe("id");
  });

  it("falls back to id for an unsupported device language", () => {
    expect(resolveUiLocale({ deviceLanguage: "fr-FR" })).toBe("id");
  });

  it("falls back to id when nothing is known", () => {
    expect(resolveUiLocale({})).toBe("id");
    expect(resolveUiLocale({ saved: null, deviceLanguage: null })).toBe("id");
  });
});
