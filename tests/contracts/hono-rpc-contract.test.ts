import { describe, expect, expectTypeOf, it } from "vitest";
import { createApiClient } from "../../packages/api/src/client.js";

const client = createApiClient("http://127.0.0.1:3000");

function assertCreateDemoRequestContract() {
  // A backend schema rename or incompatible input must fail this compile-time proof.
  // @ts-expect-error The API accepts the Zod-inferred `name` field, not arbitrary fields.
  client.api.demos.$post({ json: { title: "Atlas" } });
}

describe("Hono RPC contract", () => {
  it("infers the Zod POST input and successful demo response", () => {
    expectTypeOf<Parameters<typeof client.api.demos.$post>[0]>().toMatchTypeOf<{
      json: { name: string };
    }>();

    type CreateDemoResponse = Awaited<
      ReturnType<typeof client.api.demos.$post>
    >;

    expectTypeOf<CreateDemoResponse>().toMatchTypeOf<{
      json: () => Promise<unknown>;
      status: number;
    }>();
    type CreatedDemoResponse = Extract<CreateDemoResponse, { status: 201 }>;

    expectTypeOf<
      Awaited<ReturnType<CreatedDemoResponse["json"]>>
    >().toEqualTypeOf<{
      createdAt: string;
      id: string;
      name: string;
    }>();
    expect(typeof assertCreateDemoRequestContract).toBe("function");
  });
});
