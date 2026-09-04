export const UI_LOCALES = ["en", "id"] as const;

export type UiLocale = (typeof UI_LOCALES)[number];

export const UI_LOCALE_STORAGE_KEY = "ui-locale";

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === "string" && (UI_LOCALES as readonly string[]).includes(value);
}

/** Order: saved choice → device language when supported → `id` (Bahasa Indonesia). */
export function resolveUiLocale(input: {
  saved?: string | null;
  deviceLanguage?: string | null;
}): UiLocale {
  if (isUiLocale(input.saved)) return input.saved;

  const device = input.deviceLanguage;
  if (typeof device === "string" && device) {
    const primary = device.trim().toLowerCase().replace("_", "-").split("-")[0] ?? "";
    if (isUiLocale(primary)) return primary;
  }

  return "id";
}

/** Read the saved choice (SecureStore) and the device language, then resolve. */
export async function loadUiLocale(): Promise<UiLocale> {
  let saved: string | null = null;
  let deviceLanguage: string | null = null;
  try {
    const SecureStore = await import("expo-secure-store");
    saved = await SecureStore.getItemAsync(UI_LOCALE_STORAGE_KEY);
  } catch {
    saved = null;
  }
  try {
    const Localization = await import("expo-localization");
    deviceLanguage = Localization.getLocales()[0]?.languageTag ?? null;
  } catch {
    deviceLanguage = null;
  }
  return resolveUiLocale({ saved, deviceLanguage });
}

export async function persistUiLocale(locale: UiLocale): Promise<void> {
  try {
    const SecureStore = await import("expo-secure-store");
    await SecureStore.setItemAsync(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore keychain failures; the in-memory locale still applies this session.
  }
}
