import { describe, expect, it } from "vitest";

describe("local Sentra Personal materializer", () => {
  it("creates exactly one local personal bot from the account blueprint", async () => {
    const { materializeSentraPersonal } = await import("./personal-bot.js");
    const bots: Array<{ id: string; name: string; kind: string }> = [];
    const storage = {
      findByKind: async (kind: string) => bots.find((bot) => bot.kind === kind) ?? null,
      create: async (bot: { id: string; name: string; kind: "sentra_personal" }) => {
        bots.push(bot);
      },
    };

    await materializeSentraPersonal(storage, { newId: () => "local-bot-1" });
    await materializeSentraPersonal(storage, { newId: () => "local-bot-2" });

    expect(bots).toEqual([{ id: "local-bot-1", name: "Sentra Personal", kind: "sentra_personal" }]);
  });
});
