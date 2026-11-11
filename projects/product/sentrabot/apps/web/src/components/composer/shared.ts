import { t } from "@lingui/core/macro";
import type { ThreadMessage } from "@sentrabot/contracts";

export type PendingAttachment = {
  id: string;
  threadKey: string;
  file: File;
  previewUrl?: string;
};

export function previewMessageText(message: ThreadMessage): string {
  const text = message.blocks
    .map((block) =>
      block.kind === "text" || block.kind === "phone_channel_message" ? block.text : "",
    )
    .filter(Boolean)
    .join(" ")
    .trim();
  if (text) return text;
  if (message.blocks.some((block) => block.kind === "image" || block.kind === "file")) {
    return t`Attachment`;
  }
  return t`Message`;
}
