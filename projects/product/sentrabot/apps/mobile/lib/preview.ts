const MAX_PREVIEW_WORDS = 12;

export function previewSnippet(markdown: string, maxWords = MAX_PREVIEW_WORDS): string {
  const words = stripMarkdown(markdown).split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, "$1")
    .replace(/~~~[\w-]*\n?([\s\S]*?)~~~/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)([^*_\n]+)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
