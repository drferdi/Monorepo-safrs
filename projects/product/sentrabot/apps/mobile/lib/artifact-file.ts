import { attachmentExtensionForMimeType } from "@sentrabot/core";

export function artifactCacheFileName(artifactId: string, mimeType: string): string {
  const safeId = artifactId.replace(/[^A-Za-z0-9_-]/g, "_") || "attachment";
  return `${safeId}${attachmentExtensionForMimeType(mimeType)}`;
}
