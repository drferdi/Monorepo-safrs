import type { ComposioProvider } from "@sentrabot/adapters";
import type { Actor, MessageBlock } from "@sentrabot/contracts";
import { featuredConnectorProvidersMatch } from "@sentrabot/core";
import {
  createThreadMessage,
  IsolationError,
  type PrismaClient,
  type ThreadEvents,
} from "@sentrabot/db";

/**
 * First-run conversational onboarding, seeded deterministically into the bot's
 * thread: greeting, a focus choice, and Composio app cards the user authorizes
 * inline. Focus must not rename the bot. No model tokens are spent.
 */

type OnboardingDeps = {
  prisma: PrismaClient;
  events: ThreadEvents;
  composio?: Pick<ComposioProvider, "catalog">;
};

type FocusOption = {
  id: string;
  letter: string;
  label: string;
  summary: string;
  apps: string[];
};

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: "day",
    letter: "A",
    label: "Pekerjaan sehari-hari",
    summary: "Slack, kalender, dan email",
    apps: ["slack", "gmail", "googlecalendar"],
  },
  {
    id: "inbox",
    letter: "B",
    label: "Kotak masuk & email",
    summary: "email dan kalender",
    apps: ["gmail", "googlecalendar", "slack"],
  },
  {
    id: "research",
    letter: "C",
    label: "Riset & penulisan",
    summary: "web, catatan, dan dokumen",
    apps: ["hackernews", "notion", "googledocs"],
  },
  {
    id: "everything",
    letter: "D",
    label: "Sedikit dari semuanya",
    summary: "Slack, kalender, dan email",
    apps: ["slack", "gmail", "googlecalendar"],
  },
];

const APP_DESCRIPTIONS: Record<string, string> = {
  slack: "Cari, baca, dan kirim pesan.",
  gmail: "Cari, baca, buat draf, dan kirim email.",
  googlecalendar: "Cari acara dan jadwalkan pertemuan.",
  notion: "Cari dan sunting halaman serta database.",
  googledocs: "Buat draf dan sunting dokumen.",
  hackernews: "Cari cerita dan diskusi.",
};

const APP_NAMES: Record<string, string> = {
  gmail: "Gmail",
  googlecalendar: "Google Calendar",
  googledocs: "Google Docs",
  hackernews: "Hacker News",
  notion: "Notion",
  slack: "Slack",
};

async function requireBotThread(deps: OnboardingDeps, actor: Actor, botId: string) {
  const bot = await deps.prisma.bot.findFirst({
    where: { id: botId, workspaceId: actor.workspaceId, userId: actor.userId },
    include: { thread: true },
  });
  if (!bot?.thread) throw new IsolationError();
  return { bot, thread: bot.thread };
}

async function post(
  deps: OnboardingDeps,
  target: { workspaceId: string; botId: string; threadId: string },
  blocks: MessageBlock[],
): Promise<string> {
  const message = await createThreadMessage(deps.prisma, {
    threadId: target.threadId,
    role: "bot",
    blocks,
  });
  await deps.events.append({
    workspaceId: target.workspaceId,
    threadId: target.threadId,
    botId: target.botId,
    type: "thread.message.created",
    payload: { messageId: message.id, role: "bot", blocks },
  });
  return message.id;
}

async function updateBlocks(
  deps: OnboardingDeps,
  target: { workspaceId: string; botId: string; threadId: string },
  messageId: string,
  blocks: MessageBlock[],
): Promise<void> {
  await deps.prisma.message.update({ where: { id: messageId }, data: { blocks } });
  await deps.events.append({
    workspaceId: target.workspaceId,
    threadId: target.threadId,
    botId: target.botId,
    type: "thread.message.updated",
    payload: { messageId, role: "bot", blocks },
  });
}

export async function startOnboarding(
  deps: OnboardingDeps,
  actor: Actor,
  botId: string,
): Promise<void> {
  const { bot, thread } = await requireBotThread(deps, actor, botId);
  const existing = await deps.prisma.message.count({ where: { threadId: thread.id } });
  if (existing > 0) return;
  const user = await deps.prisma.user.findUnique({
    where: { id: actor.userId },
    select: { name: true },
  });
  const firstName = (user?.name ?? "").split(/\s+/)[0];
  const target = { workspaceId: actor.workspaceId, botId: bot.id, threadId: thread.id };
  await post(deps, target, [
    {
      kind: "text",
      text: `Halo${firstName ? ` ${firstName}` : ""}. Saya mulai dari nol, jadi saya buat singkat saja.`,
    },
  ]);
  await post(deps, target, [
    {
      kind: "choice",
      question: "Mau saya pegang apa lebih dulu?",
      options: FOCUS_OPTIONS.map(({ id, letter, label }) => ({ id, letter, label })),
    },
  ]);
}

export async function chooseFocus(
  deps: OnboardingDeps,
  actor: Actor,
  botId: string,
  optionId: string,
): Promise<void> {
  const option = FOCUS_OPTIONS.find((entry) => entry.id === optionId);
  if (!option) throw new IsolationError();
  const { bot, thread } = await requireBotThread(deps, actor, botId);
  const target = { workspaceId: actor.workspaceId, botId: bot.id, threadId: thread.id };

  const recent = await deps.prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
  });
  const pending = recent.find((message) =>
    (message.blocks as MessageBlock[]).some((block) => block.kind === "choice" && !block.answerId),
  );
  if (!pending) return;
  const blocks = (pending.blocks as MessageBlock[]).map((block) =>
    block.kind === "choice" ? { ...block, answerId: option.id } : block,
  );
  await updateBlocks(deps, target, pending.id, blocks);

  // Keep the name and title the user chose when creating the bot; the focus
  // step only suggests apps, it must not rename the bot.
  await post(deps, target, [
    {
      kind: "text",
      text: `Siap. ${capitalize(option.summary)}. Saya cek dulu apa yang sudah terhubung supaya Anda tidak perlu mengatur dua kali.`,
    },
  ]);

  const catalog = deps.composio
    ? await deps.composio
        .catalog({
          operationId: "onboarding.choose",
          traceId: "onboarding.choose",
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          botId: bot.id,
          signal: new AbortController().signal,
        })
        .catch(() => [])
    : [];
  const bySlug = new Map(catalog.map((entry) => [entry.slug.toLowerCase(), entry]));
  const cards: MessageBlock[] = option.apps.map((slug) => {
    const entry = bySlug.get(slug.toLowerCase());
    return {
      kind: "app_connect",
      provider: entry?.slug ?? slug,
      name: entry?.name ?? APP_NAMES[slug] ?? capitalize(slug),
      description: APP_DESCRIPTIONS[slug] ?? `Hubungkan ${entry?.name ?? slug} ke akun Anda.`,
      logo: entry?.logo ?? null,
      status: entry?.connected ? "connected" : "pending",
    };
  });
  const cardNames = cards
    .map((card) => (card.kind === "app_connect" ? card.name : ""))
    .filter(Boolean);
  const named = `${cardNames.slice(0, -1).join(", ")}${cardNames.length > 1 ? ", dan " : ""}${cardNames.at(-1)}`;
  await post(deps, target, [
    {
      kind: "text",
      text: `${named} adalah awal yang bagus. Hubungkan di sini, dan saya pakai yang sudah Anda punya.`,
    },
  ]);
  await post(deps, target, cards);
  await post(deps, target, [
    {
      kind: "text",
      text: `Hubungkan ${cards.length === 1 ? "satu" : cards.length === 2 ? "dua" : "tiga"} itu, dan saya mulai menyusun gambarannya.`,
    },
  ]);
}

export async function markAppConnected(
  deps: OnboardingDeps,
  actor: Actor,
  botId: string,
  provider: string,
): Promise<void> {
  const { bot, thread } = await requireBotThread(deps, actor, botId);
  const target = { workspaceId: actor.workspaceId, botId: bot.id, threadId: thread.id };
  const messages = await deps.prisma.message.findMany({
    where: { threadId: thread.id },
    select: { id: true, blocks: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  for (const message of messages) {
    const blocks = message.blocks as MessageBlock[];
    if (
      !blocks.some(
        (block) =>
          block.kind === "app_connect" &&
          featuredConnectorProvidersMatch(block.provider, provider) &&
          block.status !== "connected",
      )
    )
      continue;
    const next = blocks.map((block) =>
      block.kind === "app_connect" && featuredConnectorProvidersMatch(block.provider, provider)
        ? { ...block, status: "connected" as const }
        : block,
    );
    await updateBlocks(deps, target, message.id, next);
  }
}

function capitalize(value: string): string {
  return value.length > 0 ? (value[0] ?? "").toUpperCase() + value.slice(1) : value;
}
