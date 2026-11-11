import { implement, ORPCError } from "@orpc/server";
import { type Actor, appContract } from "@sentrabot/contracts";

export function createOs() {
  return implement(appContract).$context<{ actor: Actor | null; signal?: AbortSignal }>();
}

export type AppOs = ReturnType<typeof createOs>;

export function createAuthed(os: AppOs) {
  return os.use(async ({ context, next }) => {
    if (!context.actor) throw new ORPCError("UNAUTHORIZED");
    return next({ context: { ...context, actor: context.actor } });
  });
}

export type Authed = ReturnType<typeof createAuthed>;
