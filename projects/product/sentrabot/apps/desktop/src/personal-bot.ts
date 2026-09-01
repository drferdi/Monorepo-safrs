export interface LocalPersonalBotStorage {
  findByKind(kind: "sentra_personal"): Promise<{ id: string } | null>;
  create(bot: { id: string; name: string; kind: "sentra_personal" }): Promise<void>;
}

/** First trusted Desktop Runtime materializes the default bot locally. */
export async function materializeSentraPersonal(
  storage: LocalPersonalBotStorage,
  dependencies: { newId(): string },
): Promise<void> {
  if (await storage.findByKind("sentra_personal")) return;
  await storage.create({
    id: dependencies.newId(),
    name: "Sentra Personal",
    kind: "sentra_personal",
  });
}
