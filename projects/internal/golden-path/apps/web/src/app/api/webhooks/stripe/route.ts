import { serverEnv } from "@safrs/env/server";
import Stripe from "stripe";

/* Stripe capability pack. This static route takes precedence over the
   optional catch-all /api/[[...route]] mounted from @safrs/api.
   Local development: `pnpm stripe:listen` forwards events here. */

type WebhookError = {
  code: string;
  message: string;
  correlationId: string;
};

function webhookError(
  code: string,
  message: string,
  correlationId: string,
): WebhookError {
  return { code, correlationId, message };
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const headers = { "x-correlation-id": correlationId };

  if (!serverEnv.STRIPE_SECRET_KEY || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return Response.json(
      webhookError(
        "STRIPE_NOT_CONFIGURED",
        "Stripe belum dikonfigurasi. Isi STRIPE_SECRET_KEY dan STRIPE_WEBHOOK_SECRET.",
        correlationId,
      ),
      { headers, status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      webhookError(
        "SIGNATURE_MISSING",
        "Header stripe-signature wajib ada.",
        correlationId,
      ),
      { headers, status: 400 },
    );
  }

  const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      serverEnv.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json(
      webhookError(
        "SIGNATURE_INVALID",
        "Tanda tangan webhook tidak valid.",
        correlationId,
      ),
      { headers, status: 400 },
    );
  }

  /* Handle the events the application cares about here. Unknown event types
     are acknowledged so Stripe stops retrying them. */
  switch (event.type) {
    default:
      break;
  }

  return Response.json(
    { eventType: event.type, received: true },
    { headers, status: 200 },
  );
}
