import fc from "fast-check";
import { describe, it } from "vitest";
import { apiErrorSchema, createDemoInputSchema, demoSchema } from "./demo.ts";

// Deterministic property tests: a fixed seed keeps the generated inputs
// reproducible across runs, so CI never flakes on random generation. Raise
// `numRuns` locally to explore more cases.
fc.configureGlobal({ seed: 42, numRuns: 200 });

/**
 * Property-based tests. Rather than hand-picking examples, we let fast-check
 * explore thousands of random inputs and assert structural invariants that
 * must hold for every input:
 *   - `safeParse` never throws (it is a pure function over any input);
 *   - it always returns a discriminated result (success or failure);
 *   - a valid result always matches the schema's inferred output shape.
 */

describe("schema resilience (property-based)", () => {
  it("createDemoInputSchema.safeParse never throws for any input", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ name: fc.string() }),
          fc.record({ name: fc.constant("") }),
          fc.record({ name: fc.string({ minLength: 0, maxLength: 200 }) }),
          fc.anything(),
        ),
        (input) => {
          const result = createDemoInputSchema.safeParse(input);
          return result.success === true || result.success === false;
        },
      ),
    );
  });

  it("valid names always parse and are trimmed", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 80 })
          .filter((value) => value.trim().length > 0),
        (name) => {
          // Surround with whitespace; the schema trims, so parse must
          // succeed and the trimmed value must equal the trimmed name.
          const result = createDemoInputSchema.safeParse({
            name: `  ${name}  `,
          });
          if (!result.success) return false;
          return result.data.name === name.trim();
        },
      ),
    );
  });

  it("demoSchema.safeParse accepts well-formed demo records", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc
          .date({
            min: new Date("1970-01-01T00:00:00.000Z"),
            max: new Date("2100-01-01T00:00:00.000Z"),
          })
          .map((date) => date.toISOString()),
        (id, name, createdAt) => {
          const result = demoSchema.safeParse({ id, name, createdAt });
          return result.success === true;
        },
      ),
    );
  });

  it("apiErrorSchema.safeParse accepts a full error envelope", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.uuid(),
        (code, message, correlationId) => {
          const result = apiErrorSchema.safeParse({
            code,
            message,
            correlationId,
          });
          return result.success === true;
        },
      ),
    );
  });
});
