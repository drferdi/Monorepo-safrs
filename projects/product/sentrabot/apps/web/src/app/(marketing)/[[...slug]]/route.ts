import { NextResponse } from "next/server";
import { loadMarketingHtml } from "../../../lib/load-marketing-html.ts";
import {
  pathnameFromSlug,
  resolveMarketingPage,
} from "../../../lib/marketing-routes.ts";
import { prepareMarketingHtml } from "../../../lib/prepare-marketing-html.ts";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ slug?: string[] }>;
}

export function generateStaticParams() {
  return [{}];
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const pageName = resolveMarketingPage(pathnameFromSlug(slug));
  if (!pageName) {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  const html = await loadMarketingHtml(pageName);
  return new NextResponse(prepareMarketingHtml(html), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
