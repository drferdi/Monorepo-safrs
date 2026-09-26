/** Canonical app slug and storage keys for med-assist. */
export const APP_SLUG = 'med-assist' as const;
export const APP_PACKAGE_NAME = '@the-abyss/med-assist' as const;
export const APP_ASSIST_ID = 'med-assist-sidepanel' as const;

export const SETTINGS_STORAGE_KEY = 'med-assist:settings' as const;
export const WORKSPACE_URL_STORAGE_KEY = 'med-assist:workspaceUrl' as const;
export const THEME_STORAGE_KEY = 'med-assist-theme' as const;

const LEGACY_STORAGE_MIGRATIONS: ReadonlyArray<readonly [string, string]> = [
  ['sentra-assist:settings', SETTINGS_STORAGE_KEY],
  ['sentra-assist:workspaceUrl', WORKSPACE_URL_STORAGE_KEY],
  ['sentra-assist-theme', THEME_STORAGE_KEY],
];

/** Copy legacy sentra-assist localStorage values once on upgrade. */
export function migrateLegacyAppStorageKeys(): void {
  if (typeof localStorage === 'undefined') return;

  for (const [legacyKey, nextKey] of LEGACY_STORAGE_MIGRATIONS) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null && localStorage.getItem(nextKey) === null) {
      localStorage.setItem(nextKey, legacyValue);
    }
  }
}
