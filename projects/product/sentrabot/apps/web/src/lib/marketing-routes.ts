/** Phase 1: single Webflow landing (`home.html`) only. Other routes redirect to `/`. */
export const MARKETING_LANDING_ONLY = true;

export const MARKETING_ROUTE_MAP = {
  "/": "home",
} as const satisfies Record<string, string>;

export type MarketingPageName =
  (typeof MARKETING_ROUTE_MAP)[keyof typeof MARKETING_ROUTE_MAP];

export function pathnameFromSlug(slug?: string[]): string {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.join("/")}/`;
}

export function resolveMarketingPage(
  pathname: string,
): MarketingPageName | null {
  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (
    MARKETING_ROUTE_MAP[normalized as keyof typeof MARKETING_ROUTE_MAP] ?? null
  );
}

export function marketingStaticParams(): Array<{ slug: string[] }> {
  return [];
}
