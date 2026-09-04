import { describe, expect, it } from "vitest";
import {
  normalizeUiLocale,
  persistUiLocale,
  resolveUiLocale,
  UI_LOCALE_STORAGE_KEY,
} from "./ui-locale";

describe("normalizeUiLocale", () => {
  it("maps regional tags onto supported locales", () => {
    expect(normalizeUiLocale("de-DE")).toBe("de");
    expect(normalizeUiLocale("ko-KR")).toBe("ko");
    expect(normalizeUiLocale("en-US")).toBe("en");
    expect(normalizeUiLocale("pt-BR")).toBe("pt-BR");
    expect(normalizeUiLocale("pt")).toBe("pt-BR");
    expect(normalizeUiLocale("hi-IN")).toBe("hi");
    expect(normalizeUiLocale("id-ID")).toBe("id");
    expect(normalizeUiLocale("id")).toBe("id");
    expect(normalizeUiLocale("DE")).toBe("de");
  });

  it("falls back to Indonesian for unknown locales", () => {
    expect(normalizeUiLocale("fr-FR")).toBe("id");
    expect(normalizeUiLocale("he-IL")).toBe("id");
    expect(normalizeUiLocale("")).toBe("id");
    expect(normalizeUiLocale(null)).toBe("id");
  });
});

describe("resolveUiLocale", () => {
  it("prefers the saved choice over env and navigator", () => {
    expect(
      resolveUiLocale({
        stored: "ko",
        envDefault: "de",
        navigatorLanguage: "en-US",
      }),
    ).toBe("ko");
  });

  it("uses VITE_DEFAULT_UI_LOCALE when nothing is saved", () => {
    expect(
      resolveUiLocale({
        stored: null,
        envDefault: "de-AT",
        navigatorLanguage: "ko-KR",
      }),
    ).toBe("de");
  });

  it("uses navigator.language next, then Indonesian", () => {
    expect(
      resolveUiLocale({
        stored: null,
        envDefault: null,
        navigatorLanguage: "ko-KR",
      }),
    ).toBe("ko");
    expect(
      resolveUiLocale({
        stored: null,
        envDefault: null,
        navigatorLanguage: "de-DE",
      }),
    ).toBe("de");
    expect(
      resolveUiLocale({
        stored: null,
        envDefault: null,
        navigatorLanguage: "fr-FR",
      }),
    ).toBe("id");
    expect(
      resolveUiLocale({
        stored: null,
        envDefault: null,
        navigatorLanguage: null,
      }),
    ).toBe("id");
  });

  it("honours a saved English choice", () => {
    expect(
      resolveUiLocale({
        stored: "en",
        envDefault: null,
        navigatorLanguage: "id-ID",
      }),
    ).toBe("en");
  });

  it("reads localStorage via the storage helper", () => {
    const storage = {
      getItem: (key: string) => (key === UI_LOCALE_STORAGE_KEY ? "de" : null),
    };
    expect(resolveUiLocale({ storage, envDefault: null, navigatorLanguage: null })).toBe("de");
  });
});

describe("persistUiLocale", () => {
  it("writes the storage key", () => {
    const store = new Map<string, string>();
    persistUiLocale("ko", {
      setItem: (key, value) => {
        store.set(key, value);
      },
    });
    expect(store.get(UI_LOCALE_STORAGE_KEY)).toBe("ko");
  });
});
