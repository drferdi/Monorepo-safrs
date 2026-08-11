#!/usr/bin/env bash
# Prints a starting sketch for a new Hono RPC route in the @safrs/api pattern.
# Usage: scaffold-route.sh <route_name>
# The output is a reference; adapt it into the chained createRoutes() builder in packages/api/src/app.ts.
set -euo pipefail

route_name="${1:?usage: scaffold-route.sh <route_name>}"

cat <<EOF
# 1) Schema (packages/schemas/src/${route_name}.ts)
import { z } from "zod";
export const ${route_name}Schema = z.object({
  // TODO: define contract
  name: z.string().min(1),
});

# 2) Re-export (packages/schemas/src/index.ts)
export { ${route_name}Schema } from "./${route_name}.ts";

# 3) Route (add inside createRoutes() in packages/api/src/app.ts)
.post(
  "/${route_name}",
  zValidator("json", ${route_name}Schema, (result, context) => {
    if (result.success) return;
    return context.json(
      validationError(result.error, (context as Context<ApiEnvironment>).get("correlationId")),
      400,
    );
  }),
  async (context) => {
    const { name } = context.req.valid("json");
    // TODO: call store/database; return serialized result
    return context.json({ accepted: true, name }, 201);
  },
)

# 4) Test (packages/api/src/${route_name}.test.ts) — see packages/api/src/app.test.ts for the harness.
#    Cover: happy path, validation error (400 + error envelope), error envelope shape.
EOF