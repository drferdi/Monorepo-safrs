const BLOCKED_SCRIPT_PATTERN =
  /<script\b[^>]*(?:googletagmanager|intellimize)[^>]*>[\s\S]*?<\/script>/gi;

/** Strip analytics embeds only — do not alter Webflow layout markup. */
export function prepareMarketingHtml(html: string): string {
  return html.replace(BLOCKED_SCRIPT_PATTERN, "");
}

export function extractMarketingTitle(html: string): string | undefined {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match?.[1]?.trim();
}
