import { app } from "@safrs/api";
import { handle } from "hono/vercel";

const handler = handle(app);

export {
  handler as DELETE,
  handler as GET,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
