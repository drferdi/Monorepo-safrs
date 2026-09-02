import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { AgentSkillCatalogEntry, ThreadMessage } from "@sentrabot/contracts";
import { ATTACHMENT_ALLOWED_MIME_TYPES } from "@sentrabot/contracts";
import {
  type ComposerMention,
  mentionChipKey,
  SLASH_ACTIONS,
  type SlashActionId,
  serializeComposerPrompt,
  truncateSlashDescription,
} from "@sentrabot/core";
import { BotAvatar } from "@sentrabot/ui-web";
import {
  ArrowUp,
  Box,
  Clock,
  Mic,
  Paperclip,
  Plus,
  Puzzle,
  Settings,
  Square,
  X,
} from "lucide-react";
import {
  type DragEvent,
  memo,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isFileDrag } from "../../lib/pending-attachments";
import { type PendingAttachment, previewMessageText } from "./shared";

const ATTACHMENT_ACCEPT = ATTACHMENT_ALLOWED_MIME_TYPES.join(",");

export const Composer = memo(function Composer({
  activeName,
  running,
  disabled,
  pendingAttachments,
  attachmentNotice,
  sendError,
  dictationError,
  runError,
  onDismissError,
  sending,
  fileInputRef,
  onAttachmentPick,
  onRemoveAttachment,
  onSend,
  onStop,
  replyTarget,
  replyTargetName,
  onClearReply,
  mentionTargets,
  agentSkills,
  onSlashOpen,
  onSlashAction,
  dictating,
  transcribe,
  onDictateStart,
  onDictateStop,
}: {
  activeName?: string;
  running: boolean;
  disabled?: boolean;
  pendingAttachments: PendingAttachment[];
  attachmentNotice: string | null;
  sendError: string | null;
  dictationError: string | null;
  runError: string | null;
  onDismissError: () => void;
  sending: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAttachmentPick: (files: FileList | null) => void | Promise<void>;
  onRemoveAttachment: (attachment: PendingAttachment) => void;
  onSend: (text: string, mentions?: ComposerMention[]) => Promise<void>;
  onStop: () => Promise<void>;
  replyTarget?: ThreadMessage | null;
  replyTargetName?: string;
  onClearReply?: () => void;
  mentionTargets?: ComposerMention[];
  agentSkills?: AgentSkillCatalogEntry[];
  onSlashOpen?: () => void;
  onSlashAction?: (action: SlashActionId) => void;
  dictating: boolean;
  transcribe: boolean;
  onDictateStart: (onFinal: (text: string) => void) => void;
  onDictateStop: () => void;
}) {
  const { t } = useLingui();
  const [draft, setDraft] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<AgentSkillCatalogEntry | null>(null);
  const [selectedMentions, setSelectedMentions] = useState<ComposerMention[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragDepth = useRef(0);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const canSend =
    draft.trim().length > 0 ||
    selectedSkill !== null ||
    selectedMentions.length > 0 ||
    pendingAttachments.length > 0;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    function syncHeight() {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }

    syncHeight();
    let lastWidth = el.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const width = textarea.getBoundingClientRect().width;
      if (width === lastWidth) return;
      lastWidth = width;
      syncHeight();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [draft]);

  function updateDraft(value: string) {
    setDraft(value);
    const mentionMatch = /(?:^|\s)@([\w-]*)$/.exec(value);
    setMentionQuery(mentionMatch ? (mentionMatch[1] ?? "") : null);
    // `/` only at the start of the draft so forced skills expand (`Use skill:` / `/Name` prefix).
    const slashMatch = selectedSkill === null ? /^\/([^\n]*)$/.exec(value) : null;
    const nextSlash = slashMatch ? (slashMatch[1] ?? "") : null;
    if (nextSlash !== null && slashQuery === null) onSlashOpen?.();
    setSlashQuery(nextSlash);
  }

  function insertMention(mention: ComposerMention) {
    setDraft((current) => current.replace(/@([\w-]*)$/, ""));
    setMentionQuery(null);
    setSelectedMentions((current) =>
      current.some((selected) => mentionChipKey(selected) === mentionChipKey(mention))
        ? current
        : [...current, mention],
    );
  }

  function insertSkill(skill: AgentSkillCatalogEntry) {
    setSelectedSkill(skill);
    setDraft("");
    setSlashQuery(null);
  }

  function runSlashAction(action: SlashActionId) {
    setDraft("");
    setSlashQuery(null);
    onSlashAction?.(action);
  }

  function removeLastChip() {
    if (selectedMentions.length > 0) {
      setSelectedMentions((current) => current.slice(0, -1));
      return;
    }
    if (selectedSkill) setSelectedSkill(null);
  }

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null || !mentionTargets?.length) return [];
    const query = mentionQuery.trim().toLowerCase();
    return mentionTargets
      .filter((target) => !query || target.name.toLowerCase().startsWith(query))
      .slice(0, 10);
  }, [mentionQuery, mentionTargets]);

  const slashSkillOptions = useMemo(() => {
    if (slashQuery === null) return [];
    const query = slashQuery.trim().toLowerCase();
    const skills = agentSkills ?? [];
    return skills
      .filter((skill) => {
        if (!query) return true;
        return (
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [agentSkills, slashQuery]);

  const slashActionOptions = useMemo(() => {
    if (slashQuery === null) return [];
    const query = slashQuery.trim().toLowerCase();
    return SLASH_ACTIONS.filter((action) => !query || action.label.toLowerCase().includes(query));
  }, [slashQuery]);

  const showSlashPicker =
    slashQuery !== null &&
    mentionQuery === null &&
    (slashSkillOptions.length > 0 || slashActionOptions.length > 0);

  function send() {
    if (!canSend || sending || disabled) return;
    const text = serializeComposerPrompt(draft, selectedSkill, selectedMentions);
    setDraft("");
    setMentionQuery(null);
    setSlashQuery(null);
    setSelectedSkill(null);
    const mentions = selectedMentions;
    setSelectedMentions([]);
    void onSend(text, mentions);
  }

  function handleDragEnter(event: DragEvent<HTMLFieldSetElement>) {
    const dataTransfer = event.dataTransfer;
    if (!isFileDrag(dataTransfer)) return;
    event.preventDefault();
    if (disabled) {
      dragDepth.current = 0;
      setDraggingFiles(false);
      return;
    }
    dragDepth.current += 1;
    setDraggingFiles(true);
  }

  function handleDragOver(event: DragEvent<HTMLFieldSetElement>) {
    const dataTransfer = event.dataTransfer;
    if (!isFileDrag(dataTransfer)) return;
    event.preventDefault();
    dataTransfer.dropEffect = disabled ? "none" : "copy";
    if (disabled) {
      dragDepth.current = 0;
      setDraggingFiles(false);
      return;
    }
    setDraggingFiles(true);
  }

  function handleDragLeave(event: DragEvent<HTMLFieldSetElement>) {
    if (!isFileDrag(event.dataTransfer)) return;
    if (disabled) {
      dragDepth.current = 0;
      setDraggingFiles(false);
      return;
    }
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDraggingFiles(false);
  }

  function handleDrop(event: DragEvent<HTMLFieldSetElement>) {
    const dataTransfer = event.dataTransfer;
    if (!isFileDrag(dataTransfer)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDraggingFiles(false);
    if (!disabled) void onAttachmentPick(dataTransfer.files);
  }

  const showComposerPlaceholder =
    draft.length === 0 && selectedSkill === null && selectedMentions.length === 0;
  const replyName = replyTarget ? (replyTargetName ?? previewMessageText(replyTarget)) : "";

  return (
    <fieldset
      aria-label={t`Message composer`}
      data-dragging={draggingFiles ? "files" : undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative z-30 m-0 min-w-0 border-0 px-3 pb-4 pt-3 md:px-6 md:pb-6 ${
        draggingFiles ? "rounded-[14px] ring-2 ring-inset ring-[#8B5CF6]" : ""
      }`}
    >
      {sendError || dictationError || runError ? (
        <div
          role="alert"
          data-testid="composer-error"
          className="mb-3 flex items-center gap-2 rounded-[14px] border border-[#5A2A2A] bg-[#2A1717] px-4 py-2 text-[13px] text-[#F1A8A8]"
        >
          <span className="min-w-0 flex-1">{sendError ?? dictationError ?? runError}</span>
          <button
            type="button"
            aria-label={t`Dismiss error`}
            data-testid="composer-error-dismiss"
            onClick={onDismissError}
            className="shrink-0 text-[#F1A8A8] hover:text-[#ECECEE]"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      ) : null}
      {replyTarget ? (
        <div
          data-testid="reply-chip"
          className="mb-2 flex items-center gap-2 rounded-full border border-[#26262A] bg-[#17171A] px-3 py-1.5 text-[13px] text-[#C9C9CE]"
        >
          <span className="min-w-0 flex-1 truncate text-[#85858A]">{t`Replying to ${replyName}`}</span>
          <button
            type="button"
            aria-label={t`Cancel reply`}
            onClick={onClearReply}
            className="shrink-0 text-[#85858A] hover:text-[#ECECEE]"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      ) : null}
      {attachmentNotice ? (
        <div className="mb-3 rounded-[14px] border border-[#3A3A20] bg-[#232316] px-4 py-2 text-[13px] text-[#D6CFA0]">
          {attachmentNotice}
        </div>
      ) : null}
      {pendingAttachments.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 rounded-full border border-[#26262A] bg-[#17171A] px-3 py-1.5 text-[13px] text-[#C9C9CE]"
            >
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <Paperclip size={14} strokeWidth={1.8} />
              )}
              <span className="max-w-[180px] truncate" dir="auto">
                {attachment.file.name}
              </span>
              <button
                type="button"
                aria-label={t`Remove ${attachment.file.name}`}
                onClick={() => onRemoveAttachment(attachment)}
                className="text-[#85858A] hover:text-[#ECECEE]"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {mentionOptions.length ? (
        <div
          data-testid="mention-picker"
          className="mb-2 overflow-hidden rounded-[14px] border border-[#26262A] bg-[#17171A]"
        >
          {mentionOptions.map((mention) => (
            <button
              key={mentionChipKey(mention)}
              type="button"
              aria-label={t`@${mention.name}`}
              onClick={() => insertMention(mention)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-start hover:bg-[#1F1F22]"
            >
              <MentionOptionIcon mention={mention} />
              <span className="min-w-0">
                <span dir="auto" className="block text-[14px] text-[#ECECEE]">
                  @{mention.name}
                </span>
                {mention.subtitle ? (
                  <span dir="auto" className="block truncate text-[12.5px] text-[#85858A]">
                    {mention.subtitle}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {showSlashPicker ? (
        <div
          data-testid="slash-picker"
          className="mb-2 overflow-hidden rounded-[14px] border border-[#26262A] bg-[#17171A]"
        >
          {slashSkillOptions.map((skill) => (
            <button
              key={skill.id}
              type="button"
              aria-label={t`Skill ${skill.name}`}
              onClick={() => insertSkill(skill)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-start hover:bg-[#1F1F22]"
            >
              <Box size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#9A9AA0]" />
              <span className="min-w-0">
                <span dir="auto" className="block text-[14px] text-[#ECECEE]">
                  {skill.name}
                </span>
                <span dir="auto" className="block truncate text-[12.5px] text-[#85858A]">
                  {truncateSlashDescription(skill.description)}
                </span>
              </span>
            </button>
          ))}
          {slashActionOptions.map((action) => {
            const label = slashActionLabel(action.id);
            return (
              <button
                key={action.id}
                type="button"
                aria-label={label}
                onClick={() => runSlashAction(action.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-[#1F1F22]"
              >
                <Settings size={16} strokeWidth={1.7} className="shrink-0 text-[#9A9AA0]" />
                <span className="text-[14px] text-[#ECECEE]">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div
        data-testid="composer-bar"
        className="flex items-center gap-3.5 rounded-full border border-[#202023] bg-[#131315] py-[9px] pe-2.5 ps-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={(event) => void onAttachmentPick(event.target.files)}
        />
        <button
          type="button"
          aria-label={t`Attach file`}
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-[#26262A] text-[#9A9AA0] disabled:opacity-40"
        >
          <Plus size={17} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label={dictating ? t`Stop dictation` : t`Dictate`}
          onMouseDown={(event) => {
            event.preventDefault();
            onDictateStart((text) => setDraft((current) => `${current} ${text}`.trim()));
          }}
          onMouseUp={onDictateStop}
          onMouseLeave={() => {
            if (dictating) onDictateStop();
          }}
          onTouchStart={(event) => {
            event.preventDefault();
            onDictateStart((text) => setDraft((current) => `${current} ${text}`.trim()));
          }}
          onTouchEnd={onDictateStop}
          className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border ${
            dictating
              ? "border-[#4ECB71] bg-[rgba(48,162,75,.16)] text-[#4ECB71]"
              : "border-[#26262A] text-[#9A9AA0]"
          }`}
          title={transcribe ? t`Hold to talk` : t`Hold to talk (on-device dictation)`}
        >
          <Mic size={16} strokeWidth={1.8} />
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-1.5">
          {selectedSkill ? (
            <span
              data-testid="skill-chip"
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#1C1C1F] px-2.5 py-1 text-[13px] text-[#ECECEE]"
            >
              <Box size={13} strokeWidth={1.7} className="shrink-0 text-[#B0B0B6]" />
              <span dir="auto" className="truncate">
                {selectedSkill.name}
              </span>
              <button
                type="button"
                aria-label={t`Remove skill ${selectedSkill.name}`}
                onClick={() => setSelectedSkill(null)}
                className="text-[#85858A] hover:text-[#ECECEE]"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ) : null}
          {selectedMentions.map((mention) => (
            <span
              key={mentionChipKey(mention)}
              data-testid="mention-chip"
              data-mention-kind={mention.kind}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#1C1C1F] px-2.5 py-1 text-[13px] text-[#ECECEE]"
            >
              <MentionChipIcon mention={mention} />
              <span dir="auto" className="truncate">
                {mention.name}
              </span>
              <button
                type="button"
                aria-label={t`Remove mention ${mention.name}`}
                onClick={() =>
                  setSelectedMentions((current) =>
                    current.filter(
                      (selected) => mentionChipKey(selected) !== mentionChipKey(mention),
                    ),
                  )
                }
                className="text-[#85858A] hover:text-[#ECECEE]"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </span>
          ))}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Backspace" &&
                draft.length === 0 &&
                (selectedSkill !== null || selectedMentions.length > 0)
              ) {
                event.preventDefault();
                removeLastChip();
                return;
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            disabled={disabled}
            placeholder={
              showComposerPlaceholder
                ? activeName
                  ? t`Message ${activeName}`
                  : t`Message…`
                : undefined
            }
            aria-label={activeName ? t`Message ${activeName}` : t`Message`}
            name="chat-message"
            autoComplete="off"
            dir="auto"
            rows={1}
            className="max-h-32 min-h-[24px] min-w-[8rem] flex-1 resize-none overflow-y-auto bg-transparent py-0.5 text-[15.5px] leading-6 text-[#E9E9EA] outline-none disabled:opacity-40"
          />
        </div>
        {running ? (
          <button
            type="button"
            aria-label={t`Stop`}
            onClick={() => void onStop()}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F1EF] text-[#17171A]"
          >
            <Square size={12} strokeWidth={0} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={t`Send`}
            disabled={sending || !canSend || disabled}
            onClick={send}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F1EF] text-[#17171A] disabled:opacity-50"
          >
            <ArrowUp size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </fieldset>
  );
});

function slashActionLabel(id: SlashActionId) {
  switch (id) {
    case "chat-settings":
      return t`Chat Settings`;
    case "settings-general":
      return t`Settings: General`;
    case "settings-usage":
      return t`Settings: Usage`;
  }
}

function MentionOptionIcon({ mention }: { mention: ComposerMention }) {
  if (mention.kind === "routine") {
    return <Clock size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#9A9AA0]" />;
  }
  if (mention.kind === "connector") {
    return <Puzzle size={16} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#9A9AA0]" />;
  }
  if (mention.kind === "group") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#2A2A2E] text-[9px] text-[#C9C9CE]">
        G
      </span>
    );
  }
  if (mention.kind === "everyone") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#2A2A2E] text-[9px] text-[#C9C9CE]">
        @
      </span>
    );
  }
  return <BotAvatar color={mention.color ?? "#85858A"} identity={mention.id} size={16} />;
}

function MentionChipIcon({ mention }: { mention: ComposerMention }) {
  if (mention.kind === "routine") {
    return <Clock size={13} strokeWidth={1.7} className="shrink-0 text-[#B0B0B6]" />;
  }
  if (mention.kind === "connector") {
    return <Puzzle size={13} strokeWidth={1.7} className="shrink-0 text-[#B0B0B6]" />;
  }
  if (mention.kind === "group" || mention.kind === "everyone") {
    return (
      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#2A2A2E] text-[9px] text-[#C9C9CE]">
        {mention.kind === "group" ? "G" : "@"}
      </span>
    );
  }
  return <BotAvatar color={mention.color ?? "#85858A"} identity={mention.id} size={16} />;
}
