export function buildBrowserMatrix(browserConfig) {
  const entries = [];
  const viewportEntries = Object.entries(browserConfig.viewports || {});
  for (const browser of browserConfig.browsers || ['chromium']) {
    const selected = browser === 'chromium'
      ? viewportEntries
      : viewportEntries.filter(([name]) => name === 'mobile' || name === 'desktop');
    for (const [viewportName, viewport] of selected) {
      entries.push({ browser, viewportName, ...viewport });
    }
  }
  return entries;
}

export function normalizeBaseUrl(value) {
  if (!value) return null;
  return String(value).replace(/\/$/, '');
}

export function routeUrl(base, route) {
  if (!base) return null;
  if (/^https?:\/\//i.test(route)) return route;
  return `${normalizeBaseUrl(base)}${route.startsWith('/') ? route : `/${route}`}`;
}
