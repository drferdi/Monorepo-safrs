import { describe, expect, it } from "vitest";
import { syncPrincipal, localDevelopmentPrincipal } from "../src/lib/sync/principal";

// The schema's check constraint accepts only Clerk's own shape, ^user_[A-Za-z0-9]{1,120}$ (db/migrations/0001).
// resolveAuthConfig's local mode yields the literal "local-development", which that constraint refuses, so the
// mapping is explicit here rather than discovered as a failed insert at runtime.
describe("sync principal", () => {
  it("passes a Clerk user id through unchanged", () => {
    expect(syncPrincipal("user_2abcXYZ")).toBe("user_2abcXYZ");
  });

  it("maps the loopback development principal to a reserved schema-valid id", () => {
    expect(syncPrincipal("local-development")).toBe(localDevelopmentPrincipal);
    expect(localDevelopmentPrincipal).toMatch(/^user_[A-Za-z0-9]{1,120}$/);
  });

  it("refuses anything else, so a crafted principal never reaches a query", () => {
    for (const bad of ["", "admin", "user_", "user_a/b", "../user_a", "someone@example.test", "user_" + "a".repeat(121)]) {
      expect(syncPrincipal(bad), bad).toBeNull();
    }
  });
});
