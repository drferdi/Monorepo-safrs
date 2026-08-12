import { trace } from "@opentelemetry/api";
import {
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_URL_FULL,
} from "@opentelemetry/semantic-conventions";
import type { Context, MiddlewareHandler } from "hono";

/**
 * Hono middleware that starts a root span for the request, labelled with the
 * route and HTTP method, and sets the correlation id onto the span so the
 * request trace can be correlated with the error envelope.
 *
 * The correlation id is read from the Hono `Variables` (set by an earlier
 * middleware) and stored as a span attribute. No payload data is recorded.
 */
export function telemetryMiddleware(): MiddlewareHandler {
  const tracer = trace.getTracer("safrs.hono");

  return async (context, next) => {
    const method = context.req.method;
    const path = new URL(context.req.url).pathname;
    const span = tracer.startSpan(`${method} ${path}`, {
      attributes: {
        [ATTR_HTTP_REQUEST_METHOD]: method,
        [ATTR_HTTP_ROUTE]: path,
        [ATTR_URL_FULL]: context.req.url,
      },
    });

    const correlationId = getCorrelationId(context);
    if (correlationId) span.setAttribute("safrs.correlation_id", correlationId);

    try {
      await next();
      span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, context.res.status);
    } finally {
      span.end();
    }
  };
}

function getCorrelationId(context: Context): string | undefined {
  try {
    return context.get("correlationId") as string | undefined;
  } catch {
    return undefined;
  }
}
