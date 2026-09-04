import { i18n } from "@lingui/core";
import type { UiLocale } from "./ui-locale";

export { i18n };

// Static import paths so Metro can resolve the compiled catalogs at bundle time.
const loaders: Record<UiLocale, () => Promise<{ messages: Record<string, unknown> }>> = {
  en: () => import("../locales/en/messages.mjs"),
  id: () => import("../locales/id/messages.mjs"),
};

/** Load the compiled catalog for `locale` and make it the active one. */
export async function activateLocale(locale: UiLocale): Promise<void> {
  const { messages } = await loaders[locale]();
  i18n.load(locale, messages as Parameters<typeof i18n.load>[1]);
  i18n.activate(locale);
}
