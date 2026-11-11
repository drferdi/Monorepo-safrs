import { describe, expect, it } from "vitest";
import { authReducer, initialAuthState } from "./auth";

describe("authReducer", () => {
  it("mulai loading", () => {
    expect(initialAuthState.status).toBe("loading");
  });
  it("SESSION_RESOLVED dengan user -> authenticated", () => {
    const user = { user_id: "u1", role: "owner" } as never;
    const next = authReducer(initialAuthState, {
      type: "SESSION_RESOLVED",
      user,
    });
    expect(next.status).toBe("authenticated");
    expect(next.user).toBe(user);
  });
  it("SESSION_RESOLVED tanpa user -> unauthenticated", () => {
    const next = authReducer(initialAuthState, {
      type: "SESSION_RESOLVED",
      user: null,
    });
    expect(next.status).toBe("unauthenticated");
    expect(next.user).toBeNull();
  });
  it("LOGOUT -> unauthenticated, user null", () => {
    const authed = {
      status: "authenticated" as const,
      user: { user_id: "u1" } as never,
    };
    expect(authReducer(authed, { type: "LOGOUT" })).toEqual({
      status: "unauthenticated",
      user: null,
    });
  });
});
