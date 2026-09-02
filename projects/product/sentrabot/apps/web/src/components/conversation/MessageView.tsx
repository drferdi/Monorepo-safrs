import { Trans, useLingui } from "@lingui/react/macro";
import { ChatMarkdown } from "@sentrabot/chat-ui/web";
import type { MessageBlock, ThreadMessage } from "@sentrabot/contracts";
import { abortableDelay } from "@sentrabot/core";
import { memo, useEffect, useRef, useState } from "react";
import { type ArtifactTarget, decodeArtifactBase64 } from "../../lib/artifact-open";
import { chartViewport } from "../../lib/chart-viewport";
import { connectMcpOauth } from "../../lib/mcp-connect";
import { rpc } from "../../lib/rpc";
import { ArtifactFileCard } from "../ArtifactFileCard";
import { AskCard } from "../AskCard";
import { CollaborationMarker } from "../beautiful-ui/CollaborationMarker";
import { BuiButton, BuiCard, SuccessPop } from "../beautiful-ui/primitives";
import { previewMessageText } from "../composer/shared";
import { SkillDraftCard } from "../teach/SkillDraftCard";

function ToolSteps({
  steps,
  currentIndex,
}: {
  steps: Extract<ThreadMessage["blocks"][number], { kind: "steps" }>["steps"];
  currentIndex?: number;
}) {
  return (
    <div className="space-y-1.5">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        return (
          <div key={index} className="flex items-center gap-2">
            <span
              className="text-[13px]"
              style={{
                color: isCurrent ? "#F5A03C" : "#4ECB71",
                animation: isCurrent ? "rkPulse 1.2s ease-in-out infinite" : undefined,
              }}
            >
              {isCurrent ? "◷" : "✓"}
            </span>
            <span
              className="truncate text-[14px]"
              style={{ color: isCurrent ? "#DFDFE2" : "#85858A" }}
            >
              {step.label}
              {step.count > 1 ? ` ×${step.count}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const MessageView = memo(function MessageView({
  artifactTarget,
  canAnswer,
  message,
  onAnswer,
  onOpenBot,
  onOpenPeerMessages,
  speakerName,
  memberName,
  peerBot,
  replyPreview,
  replyToMessageId,
  onJumpToMessage,
  onRefresh,
  onBotChanged,
  onAddRoutine,
  voiceReady,
  speaking,
  onSpeak,
}: {
  artifactTarget: ArtifactTarget;
  canAnswer: boolean;
  message: ThreadMessage;
  onAnswer: (message: ThreadMessage, text: string) => Promise<void>;
  onOpenBot: (botId: string) => void;
  onOpenPeerMessages: (peerBotId: string) => void;
  speakerName?: string;
  memberName?: (botId: string | undefined) => string | undefined;
  peerBot: (botId: string) => { color: string; status?: string } | undefined;
  replyPreview?: ThreadMessage;
  replyToMessageId?: string;
  onJumpToMessage?: (messageId: string) => void;
  onRefresh: () => Promise<void>;
  onBotChanged: () => Promise<void>;
  onAddRoutine: (name: string, prompt: string) => void;
  voiceReady: boolean;
  speaking: boolean;
  onSpeak: () => void;
}) {
  const { t } = useLingui();
  const isNarration =
    message.role === "bot" &&
    message.blocks.length > 0 &&
    message.blocks.every(
      (block) => block.kind === "text" || block.kind === "progress" || block.kind === "steps",
    );
  const isLive = message.id.startsWith("progress:");
  const parentJumpId = replyPreview?.id ?? replyToMessageId;
  const messageContext = (
    <>
      {speakerName ? (
        <div className="mb-1 text-[12.5px] font-medium text-[#85858A]" dir="auto">
          {speakerName}
        </div>
      ) : null}
      {parentJumpId ? (
        <button
          type="button"
          data-testid="reply-parent-preview"
          aria-label={t`Jump to replied message`}
          onClick={() => onJumpToMessage?.(parentJumpId)}
          className="mb-2 block max-w-[74%] truncate rounded-[14px] border border-[#26262A] bg-[#131315] px-3 py-2 text-start text-[12.5px] text-[#85858A] hover:border-[#34343B] hover:text-[#C9C9CE]"
          dir="auto"
        >
          {replyPreview ? previewMessageText(replyPreview) : t`Earlier message`}
        </button>
      ) : null}
    </>
  );
  if (isNarration) {
    return (
      <>
        {messageContext}
        <div className="flex justify-start">
          <div
            className="max-w-[74%] space-y-2.5 rounded-[20px] bg-[#1A1A1D] px-[18px] py-3 text-[15.5px] leading-[1.5] text-[#DFDFE2]"
            dir="auto"
          >
            {message.blocks.map((block, i) => {
              if (block.kind === "steps") {
                const isCurrentBlock = isLive && i === message.blocks.length - 1;
                return (
                  <div key={i} dir="ltr">
                    <ToolSteps
                      steps={block.steps}
                      currentIndex={isCurrentBlock ? block.steps.length - 1 : undefined}
                    />
                  </div>
                );
              }
              if (block.kind === "text" || block.kind === "progress") {
                return (
                  <div key={i}>
                    <ChatMarkdown streaming={block.kind === "progress"}>{block.text}</ChatMarkdown>
                  </div>
                );
              }
              return null;
            })}
            {!isLive && voiceReady && message.blocks.some((block) => block.kind === "text") ? (
              <button
                type="button"
                aria-label={speaking ? t`Stop speaking` : t`Speak this reply`}
                onClick={onSpeak}
                className="text-[12px] text-[#85858A] hover:text-[#ECECEE]"
              >
                {speaking ? <Trans>Stop</Trans> : <Trans>Speak</Trans>}
              </button>
            ) : null}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {messageContext}
      {message.blocks.map((block, i) => {
        if (block.kind === "handoff") {
          const from = memberName?.(block.fromBotId) ?? t`bot`;
          const to = memberName?.(block.toBotId) ?? t`bot`;
          return (
            <div
              key={i}
              className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-[#85858A]"
            >
              <span>
                ↪ {to} ← {from}
              </span>
              <span>{block.text}</span>
            </div>
          );
        }
        if (block.kind === "bot_message_sent" || block.kind === "bot_message_received") {
          const sent = block.kind === "bot_message_sent";
          const peer = sent ? block.toBotName : block.fromBotName;
          const peerBotId = sent ? block.toBotId : block.fromBotId;
          const label = sent ? t`Messaged ${peer}` : t`Message from ${peer}`;
          return (
            <CollaborationMarker
              key={i}
              ariaLabel={label}
              color={peerBot(peerBotId)?.color ?? "#85858A"}
              identity={peerBotId}
              label={label}
              onClick={() => onOpenPeerMessages(peerBotId)}
            />
          );
        }
        if (block.kind === "phone_channel_message") {
          return (
            <div
              key={i}
              className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-[#85858A]"
            >
              <span>
                iMessage · {block.fromLabel}: {block.text}
              </span>
            </div>
          );
        }
        if (block.kind === "meta") {
          return (
            <div
              key={i}
              className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-[#85858A]"
            >
              <span className="text-[#E65707]">◷</span>
              <span>{block.text}</span>
            </div>
          );
        }
        if (block.kind === "progress") {
          return (
            <div key={i} className="flex justify-start">
              <div
                className="max-w-[74%] rounded-[20px] bg-[#1A1A1D] px-[18px] py-3 text-[15.5px] leading-[1.5] text-[#DFDFE2]"
                dir="auto"
              >
                <ChatMarkdown streaming>{block.text}</ChatMarkdown>
              </div>
            </div>
          );
        }
        if (block.kind === "steps") {
          return (
            <div key={i} className="flex justify-start">
              <div
                className="max-w-[74%] space-y-1.5 rounded-[20px] bg-[#1A1A1D] px-[18px] py-3"
                dir="ltr"
              >
                <ToolSteps
                  steps={block.steps}
                  currentIndex={isLive ? block.steps.length - 1 : undefined}
                />
              </div>
            </div>
          );
        }
        if (block.kind === "subagent") {
          const running = block.status === "running";
          const failed = block.status === "failed";
          return (
            <div
              key={i}
              className="w-[min(420px,90%)] rounded-[18px] border border-[#232326] bg-[#17171A] px-[18px] py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px] font-medium text-[#ECECEE]" dir="auto">
                  {block.name}
                </span>
                <span
                  className="rounded-full px-[11px] py-1 text-[13px]"
                  style={{
                    background: failed
                      ? "rgba(230,87,7,.14)"
                      : running
                        ? "rgba(245,160,60,.14)"
                        : "rgba(48,162,75,.14)",
                    color: failed ? "#E65707" : running ? "#F5A03C" : "#4ECB71",
                    animation: running ? "rkPulse 1.2s ease-in-out infinite" : undefined,
                  }}
                >
                  {running ? <Trans>subagent</Trans> : block.status}
                </span>
              </div>
              <div className="mt-2 text-[13.5px] text-[#85858A]">{block.task}</div>
              {block.progress || block.result ? (
                <div className="mt-2.5 text-[14.5px] leading-[1.5] text-[#A8A8AD]">
                  <ChatMarkdown streaming={running}>
                    {block.result || block.progress || ""}
                  </ChatMarkdown>
                </div>
              ) : null}
            </div>
          );
        }
        if (block.kind === "child_bot") {
          const removed = block.status === "deleted" || block.status === "archived";
          return (
            <button
              key={i}
              type="button"
              disabled={removed}
              onClick={() => onOpenBot(block.botId)}
              className="w-[min(340px,90%)] rounded-[18px] border border-[#232326] bg-[#17171A] px-[18px] py-4 text-start disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#ECECEE]" dir="auto">
                  {block.name}
                </span>
                <span
                  className="rounded-full px-[11px] py-1 text-[13px]"
                  style={{
                    background: removed ? "rgba(230,87,7,.14)" : "rgba(48,162,75,.14)",
                    color: removed ? "#E65707" : "#4ECB71",
                  }}
                >
                  {block.status === "archived" ? (
                    <Trans>archived</Trans>
                  ) : block.status === "deleted" ? (
                    <Trans>deleted</Trans>
                  ) : (
                    <Trans>bot</Trans>
                  )}
                </span>
              </div>
              <div className="mt-2 text-[14.5px] leading-[1.5] text-[#A8A8AD]" dir="auto">
                {removed
                  ? block.status === "archived"
                    ? t`Archived. Chat, memory, and files kept.`
                    : t`Removed with chat, computer, and memory.`
                  : block.title || t`Opened its thread.`}
              </div>
            </button>
          );
        }
        if (block.kind === "choice") {
          const botId = "botId" in artifactTarget ? artifactTarget.botId : message.botId;
          if (!botId) return null;
          return <ChoiceCard key={i} botId={botId} block={block} onBotChanged={onBotChanged} />;
        }
        if (block.kind === "app_connect") {
          const botId = "botId" in artifactTarget ? artifactTarget.botId : message.botId;
          if (!botId) return null;
          return (
            <div key={i} className="flex justify-start">
              <AppConnectCard botId={botId} block={block} />
            </div>
          );
        }
        if (block.kind === "chart") {
          return (
            <div key={i} className="flex justify-start">
              <ChartBlockView name={block.name} spec={block.spec} data={block.data} />
            </div>
          );
        }
        if (block.kind === "mcp_approval") {
          return (
            <div key={i} className="flex justify-start">
              <McpApprovalCard
                botId={"botId" in artifactTarget ? artifactTarget.botId : message.botId}
                name={block.name}
                serverId={block.serverId}
                transport={block.transport}
                endpoint={block.endpoint}
                needsOAuth={block.needsOAuth}
              />
            </div>
          );
        }
        if (block.kind === "image") {
          return (
            <div
              key={i}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <ArtifactImage
                target={artifactTarget}
                artifactId={block.artifactId}
                name={block.name}
              />
            </div>
          );
        }
        if (block.kind === "file") {
          return (
            <div
              key={i}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <ArtifactFileCard
                target={artifactTarget}
                artifactId={block.artifactId}
                name={block.name}
                mimeType={block.mimeType}
                size={block.size}
              />
            </div>
          );
        }
        if (block.kind === "text" && message.role === "user") {
          return (
            <div key={i} className="flex justify-end">
              <div
                className="max-w-[70%] whitespace-pre-wrap rounded-[20px] bg-[#F1F1EF] px-[18px] py-3 text-[15.5px] leading-[1.45] text-[#1A1A1A]"
                dir="auto"
              >
                {block.text}
              </div>
            </div>
          );
        }
        if (block.kind === "text") {
          return (
            <div key={i} className="flex justify-start">
              <div
                className="max-w-[74%] rounded-[20px] bg-[#1A1A1D] px-[18px] py-3 text-[15.5px] leading-[1.5] text-[#DFDFE2]"
                dir="auto"
              >
                <ChatMarkdown>{block.text}</ChatMarkdown>
                {voiceReady ? (
                  <button
                    type="button"
                    aria-label={speaking ? t`Stop speaking` : t`Speak this reply`}
                    onClick={onSpeak}
                    className="mt-2 text-[12px] text-[#85858A] hover:text-[#ECECEE]"
                  >
                    {speaking ? <Trans>Stop</Trans> : <Trans>Speak</Trans>}
                  </button>
                ) : null}
              </div>
            </div>
          );
        }
        if (block.kind === "card") {
          return (
            <div key={i} className="flex justify-start">
              <div className="flex flex-col gap-2 rounded-[20px] bg-[#1A1A1D] px-5 py-4">
                {block.lines.map((line) => (
                  <div key={line.k} className="flex items-baseline gap-2.5 text-[15px]">
                    <span className="text-[#30A24B]">✓</span>
                    <span className="font-semibold text-white">{line.k}</span>
                    <span className="text-[#85858A]">→</span>
                    <span>{line.v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (block.kind === "ask") {
          return (
            <AskCard
              key={i}
              block={block}
              canAnswer={canAnswer}
              onAnswer={(text) => onAnswer(message, text)}
            />
          );
        }
        if (block.kind === "skill_draft") {
          return (
            <div key={i} className="flex justify-start">
              <SkillDraftCard block={block} onRefresh={onRefresh} onAddRoutine={onAddRoutine} />
            </div>
          );
        }
        if (block.kind === "computer") {
          return (
            <div
              key={i}
              className="w-[340px] rounded-[18px] border border-[#232326] bg-[#17171A] px-[18px] py-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#ECECEE]">
                  <Trans>Computer</Trans>
                </span>
                <span className="rounded-full bg-[rgba(48,162,75,.14)] px-[11px] py-1 text-[13px] text-[#4ECB71]">
                  {block.state}
                </span>
              </div>
              <div className="my-2.5 text-[14.5px] leading-[1.5] text-[#A8A8AD]">
                <ChatMarkdown>{block.text}</ChatMarkdown>
              </div>
            </div>
          );
        }
        return null;
      })}
    </>
  );
});

function ChoiceCard({
  botId,
  block,
  onBotChanged,
}: {
  botId: string;
  block: Extract<MessageBlock, { kind: "choice" }>;
  onBotChanged: () => Promise<void>;
}) {
  const { t } = useLingui();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(optionId: string) {
    setPending(true);
    setError(null);
    try {
      await rpc.onboarding.choose({ botId, optionId });
      await onBotChanged().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Could not save this choice`);
      setPending(false);
    }
  }

  return (
    <div className="flex justify-start">
      <div className="w-[min(420px,80%)] rounded-[20px] bg-[#1A1A1D] px-[18px] py-[14px]">
        <div className="text-[15.5px] text-[#DFDFE2]">{block.question}</div>
        {block.subtitle ? (
          <div className="mt-0.5 text-[13px] text-[#85858A]">{block.subtitle}</div>
        ) : null}
        <div className="mt-3 space-y-1.5">
          {block.options
            .filter((option) => !block.answerId || option.id === block.answerId)
            .map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={Boolean(block.answerId) || pending}
                onClick={() => void choose(option.id)}
                className={`flex w-full items-center gap-3 rounded-[12px] border border-[#2A2A2F] px-3.5 py-3 text-start disabled:opacity-60 ${block.answerId ? "bg-[#1F1F23]" : "bg-[#161619] hover:bg-[#222226]"}`}
              >
                <span className="grid h-[24px] w-[24px] place-items-center rounded-[7px] bg-[#232327] text-[12.5px] text-[#9A9AA0]">
                  {option.letter}
                </span>
                <span
                  className={`flex-1 text-[15px] ${block.answerId ? "text-[#85858A]" : "text-[#ECECEE]"}`}
                >
                  {option.label}
                </span>
                {block.answerId === option.id ? <span className="text-[#B9B9C0]">✓</span> : null}
              </button>
            ))}
        </div>
        {error ? <p className="mt-2 text-xs text-[#F07178]">{error}</p> : null}
      </div>
    </div>
  );
}

function AppConnectCard({
  botId,
  block,
}: {
  botId: string;
  block: Extract<MessageBlock, { kind: "app_connect" }>;
}) {
  const { t } = useLingui();
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState<"pending" | "connected">(block.status);
  const [error, setError] = useState<string | null>(null);
  const connectionAttempt = useRef<AbortController | null>(null);
  const status = block.status === "connected" ? "connected" : localStatus;
  useEffect(() => () => connectionAttempt.current?.abort(), []);

  async function authorize() {
    connectionAttempt.current?.abort();
    const controller = new AbortController();
    connectionAttempt.current = controller;
    setBusy(true);
    setError(null);
    try {
      const started = await rpc.connections.begin({
        provider: block.provider,
        displayName: block.name,
      });
      if (started.authorizationUrl) {
        window.open(
          started.authorizationUrl,
          "sentrabot-app-connect",
          "popup,width=560,height=720",
        );
      }
      for (let i = 0; i < 60; i += 1) {
        if (controller.signal.aborted) return;
        const row = await rpc.connections
          .complete({ connectionId: started.connectionId })
          .catch(() => undefined);
        if (row?.status === "connected") {
          if (controller.signal.aborted) return;
          setLocalStatus("connected");
          await rpc.onboarding
            .appConnected({ botId, provider: block.provider })
            .catch(() => undefined);
          return;
        }
        await abortableDelay(2_000, controller.signal);
      }
      if (!controller.signal.aborted) setError(t`Authorization timed out. Please try again.`);
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : t`Could not authorize this app`);
      }
    } finally {
      if (connectionAttempt.current === controller) {
        connectionAttempt.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <BuiCard
      role="group"
      aria-label={t`${block.name} connection`}
      className="w-[min(420px,80%)] px-4 py-3.5"
    >
      <div className="flex items-center gap-3.5">
        {block.logo ? (
          <img
            src={block.logo}
            alt=""
            className="h-10 w-10 rounded-[10px] bg-white object-contain p-1"
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#30356A] text-[15px] text-[#E2E4FF]">
            {block.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium" style={{ color: "var(--bui-ink)" }}>
            {block.name}
          </span>
          <span className="block truncate text-[13px]" style={{ color: "var(--bui-ink-3)" }}>
            {block.description}
          </span>
        </span>
        {status === "connected" ? (
          <SuccessPop label={t`Connected`} />
        ) : (
          <BuiButton disabled={busy} onClick={() => void authorize()}>
            {busy ? t`Waiting…` : t`Authorize`}
          </BuiButton>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-[#F07178]">{error}</p> : null}
    </BuiCard>
  );
}

function ChartCanvas({
  spec,
  data,
  width,
  height,
}: {
  spec: Record<string, unknown>;
  data: unknown[];
  width: number;
  height?: number;
}) {
  const { t } = useLingui();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    title?: string;
    swatches: { label: string; color: string }[];
  }>({ swatches: [] });
  useEffect(() => {
    let cancelled = false;
    // Plot loads lazily so threads without charts never pay for the library.
    void (async () => {
      try {
        const { buildPlotParts } = await import("@sentrabot/core/plot");
        if (cancelled || !ref.current) return;
        // Hover inspection by default: give the first mark a tooltip unless
        // the spec already asks for one somewhere.
        const marks = Array.isArray((spec as { marks?: unknown[] }).marks)
          ? ((spec as { marks: { options?: Record<string, unknown> }[] }).marks ?? [])
          : [];
        const hasTip = marks.some((mark) => mark.options && "tip" in mark.options);
        const liveSpec = hasTip
          ? spec
          : {
              ...spec,
              marks: marks.map((mark, index) =>
                index === 0 ? { ...mark, options: { ...(mark.options ?? {}), tip: true } } : mark,
              ),
            };
        const parts = buildPlotParts(liveSpec as never, data, document, { width, height });
        setMeta({ title: parts.title, swatches: parts.swatches });
        setError(null);
        ref.current.replaceChildren(parts.plotted);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t`Could not render chart`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spec, data, width, height, t]);
  if (error)
    return (
      <div className="text-[13px] text-[#F3A2AA]">
        <Trans>Chart failed to render: {error}</Trans>
      </div>
    );
  return (
    <div className="text-[#C9C9CE]">
      {meta.title ? (
        <div className="mb-1 text-[14.5px] font-semibold text-[#ECECEE]">{meta.title}</div>
      ) : null}
      {meta.swatches.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
          {meta.swatches.map((swatch) => (
            <span
              key={swatch.label}
              className="flex items-center gap-1.5 text-[12px] text-[#A6A6AD]"
            >
              <span
                className="h-[10px] w-[10px] rounded-[3px]"
                style={{ background: swatch.color }}
              />
              {swatch.label}
            </span>
          ))}
        </div>
      ) : null}
      <div ref={ref} className="[&_svg]:max-w-full" />
    </div>
  );
}

type McpApprovalState = "pending" | "connecting" | "connected" | "dismissed";

/** Approval card for an agent-created MCP server: the user completes browser
 * OAuth (or confirms no authorization is needed) without leaving the chat. */
function McpApprovalCard({
  botId,
  name,
  serverId,
  transport,
  endpoint,
  needsOAuth,
}: {
  botId: string | undefined;
  name: string;
  serverId: string;
  transport: string;
  endpoint: string | null;
  needsOAuth: boolean;
}) {
  const { t } = useLingui();
  const [state, setState] = useState<McpApprovalState>("pending");
  const [error, setError] = useState<string | null>(null);

  async function authorize() {
    if (!botId) {
      setError(t`This server cannot be assigned without a bot.`);
      return;
    }
    setState("connecting");
    setError(null);
    try {
      if (needsOAuth) {
        const result = await connectMcpOauth(serverId);
        if (result === "cancelled") {
          setState("pending");
          return;
        }
      }
      await rpc.mcp.assignments.approve({ botId, serverId });
      setState("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Could not approve this server`);
      setState("pending");
    }
  }

  const summary = endpoint ?? `stdio · ${transport}`;
  return (
    <BuiCard className="max-w-[74%] p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#30356A] text-xs text-[#E2E4FF]">
          M
        </span>
        <span className="text-[14.5px] font-medium" style={{ color: "var(--bui-ink)" }}>
          <Trans>Connect MCP server “{name}”</Trans>
        </span>
      </div>
      <p className="mt-1.5 truncate text-[12px]" style={{ color: "var(--bui-ink-3)" }}>
        {summary}
      </p>
      {state === "pending" || state === "connecting" ? (
        <>
          <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: "var(--bui-ink-2)" }}>
            {needsOAuth
              ? t`This server uses browser sign-in. Authorize it to let your agents use its tools — a popup will open.`
              : t`Approve this server to let your agent use its tools.`}
          </p>
          {error ? <p className="mt-2 text-xs text-[#F07178]">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <BuiButton
              tone="accent"
              disabled={state === "connecting"}
              onClick={() => void authorize()}
            >
              {state === "connecting" ? t`Connecting…` : needsOAuth ? t`Authorize` : t`Approve`}
            </BuiButton>
            <BuiButton onClick={() => setState("dismissed")}>
              <Trans>Not now</Trans>
            </BuiButton>
          </div>
        </>
      ) : null}
      {state === "connected" ? (
        <div className="mt-3">
          <SuccessPop label={t`Connected — its tools are available from your next message.`} />
        </div>
      ) : null}
      {state === "dismissed" ? (
        <p className="mt-2 text-[13px] text-[#85858A]">
          <Trans>Dismissed — reconnect anytime from MCP settings.</Trans>
        </p>
      ) : null}
    </BuiCard>
  );
}

function ChartBlockView({
  name,
  spec,
  data,
}: {
  name: string;
  spec: Record<string, unknown>;
  data: unknown[];
}) {
  const { t } = useLingui();
  const [expanded, setExpanded] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    if (!expanded) return;
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [expanded]);
  const expandedViewport = chartViewport(viewport.width, viewport.height);
  return (
    <>
      <div className="group relative max-w-[74%] rounded-[20px] bg-[#17171A] p-4">
        <ChartCanvas spec={spec} data={data} width={520} />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute end-3 top-3 rounded-lg border border-[#34343B] bg-[#1F1F22] px-2.5 py-1 text-[11px] text-[#B9B9C0] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A6A6AD]"
        >
          <Trans>Expand</Trans>
        </button>
      </div>
      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,4,5,.78)] p-8"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={(event) => {
            if (event.target === event.currentTarget) setExpanded(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setExpanded(false);
          }}
        >
          <div className="max-h-[92vh] w-[min(1320px,94vw)] overflow-auto rounded-[24px] border border-[#2A2A31] bg-[#141416] p-8 shadow-[0_40px_90px_rgba(0,0,0,.6)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] text-[#85858A]">{name}</span>
              <button
                type="button"
                aria-label={t`Close chart`}
                onClick={() => setExpanded(false)}
                className="text-lg text-[#85858A] hover:text-[#DFDFE2]"
              >
                ✕
              </button>
            </div>
            <ChartCanvas
              spec={spec}
              data={data}
              width={expandedViewport.width}
              height={expandedViewport.height}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ArtifactImage({
  target,
  artifactId,
  name,
}: {
  target: ArtifactTarget;
  artifactId: string;
  name: string;
}) {
  const { t } = useLingui();
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const targetBotId = "botId" in target ? target.botId : undefined;
  const targetGroupId = "groupId" in target ? target.groupId : undefined;

  useEffect(() => {
    const element = container.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);
    void rpc.artifacts
      .get(
        targetBotId
          ? { botId: targetBotId, artifactId }
          : { groupId: targetGroupId ?? "", artifactId },
      )
      .then((artifact) => {
        const bytes = decodeArtifactBase64(artifact.contentBase64);
        objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: artifact.mimeType }),
        );
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setSrc(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [artifactId, targetBotId, targetGroupId, visible]);

  return (
    <div ref={container}>
      {src ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="max-w-[240px] overflow-hidden rounded-[20px]"
        >
          <img src={src} alt={name} className="max-h-48 w-full object-cover" />
        </button>
      ) : (
        <div className="rounded-[20px] border border-[#26262A] bg-[#17171A] px-4 py-3 text-[14px] text-[#85858A]">
          {name}
        </div>
      )}
      {open && src ? (
        <button
          type="button"
          aria-label={t`Close image preview`}
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(4,4,5,.82)] p-6"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt={name}
            className="max-h-[85vh] max-w-[90vw] rounded-[12px] object-contain"
          />
        </button>
      ) : null}
    </div>
  );
}
