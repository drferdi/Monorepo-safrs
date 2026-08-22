import { expect, test } from "@playwright/test";

test.describe("Sentra Bot workspace", () => {
  test("renders the workspace and supports keyboard prompt entry", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page.getByRole("heading").first()).toBeVisible();
    const prompt = page.getByLabel("Prompt");
    await prompt.fill("Jalankan pemeriksaan lokal");
    await expect(prompt).toHaveValue("Jalankan pemeriksaan lokal");
    await expect(page.getByRole("button", { name: /Jalankan/ })).toBeEnabled();
    await prompt.press("Tab");
    await expect(page.getByRole("button", { name: /Jalankan/ })).toBeFocused();
  });

  test("keeps signup closed through the public API contract", async ({
    request,
  }) => {
    test.skip(
      process.env.SENTRABOT_E2E_SEED === "1",
      "seed mode enables disposable signup",
    );
    const response = await request.post("/api/sentrabot/signup/check/", {
      data: { email: "synthetic@example.test", emailVerified: true },
    });
    expect(response.status()).toBe(403);
    await expect(response.json()).resolves.toEqual({
      allowed: false,
      reason: "SIGNUP_CLOSED",
    });
  });

  test("rejects Sentra Bot data access without a session", async ({
    request,
  }) => {
    const response = await request.get("/api/sentrabot/bots/");
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  test("creates a disposable browser session and reaches the tenant-scoped API", async ({
    page,
  }) => {
    test.skip(
      process.env.SENTRABOT_E2E_SEED !== "1",
      "authenticated signup journey requires explicit disposable seed mode",
    );
    const email = `e2e-${Date.now()}@example.test`;
    await page.goto("/workspace");
    const result = await page.evaluate(
      async ({ email }) => {
        const body = (response: Response) =>
          response.json() as Promise<Record<string, unknown>>;
        const signup = await fetch("/api/auth/sign-up/email/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "E2E User",
            email,
            password: "disposable-test-password-123",
          }),
        });
        const signIn = await fetch("/api/auth/sign-in/email/", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            password: "disposable-test-password-123",
          }),
        });
        const session = await fetch("/api/auth/get-session/");
        const bots = await fetch("/api/sentrabot/bots/");
        return {
          signup: { status: signup.status, body: await body(signup) },
          signIn: { status: signIn.status, body: await body(signIn) },
          session: { status: session.status, body: await body(session) },
          bots: { status: bots.status, body: await body(bots) },
        };
      },
      { email },
    );

    expect(result.signup.status).toBe(200);
    expect(result.signIn.status).toBe(200);
    expect((result.session.body.user as { email: string }).email).toBe(email);
    expect(result.bots.status).toBe(200);
    expect(result.bots.body).toEqual([]);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("has labels, landmarks, and no keyboard-negative controls", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Bot" })).toBeVisible();
    await expect(page.getByLabel("Cari bot")).toBeVisible();
    await expect(page.getByLabel("Prompt")).toHaveAttribute("id", "prompt");
    await expect(page.locator("button:enabled")).not.toHaveCount(0);
  });
});
