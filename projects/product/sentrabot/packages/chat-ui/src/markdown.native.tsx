import Markdown, {
  MarkdownStream,
  type RenderRules,
} from "@ronradtke/react-native-markdown-display";
import { memo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { ChatMarkdownProps } from "./markdown";
import { sanitizeMarkdownUrl } from "./markdown";

const styles = StyleSheet.create({
  body: {
    color: "#DFDFE2",
    fontSize: 15.5,
    lineHeight: 23,
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 9,
    width: "100%",
    flexShrink: 1,
  },
  heading1: {
    color: "#F3F3F4",
    fontSize: 21,
    lineHeight: 27,
    marginTop: 10,
    marginBottom: 5,
  },
  heading2: {
    color: "#F3F3F4",
    fontSize: 19,
    lineHeight: 25,
    marginTop: 10,
    marginBottom: 5,
  },
  heading3: {
    color: "#F3F3F4",
    fontSize: 17,
    lineHeight: 23,
    marginTop: 8,
    marginBottom: 4,
  },
  strong: {
    color: "#F3F3F4",
    fontWeight: "700",
  },
  link: {
    color: "#86B7FF",
    textDecorationLine: "underline",
    marginBottom: 0,
  },
  code_inline: {
    color: "#ECECEE",
    backgroundColor: "#101012",
    borderColor: "#34343A",
    borderWidth: StyleSheet.hairlineWidth,
    padding: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  code_block: {
    color: "#ECECEE",
    backgroundColor: "#0E0E10",
    borderColor: "#2D2D32",
  },
  fence: {
    backgroundColor: "#0E0E10",
    borderColor: "#2D2D32",
  },
  fence_code: {
    backgroundColor: "#0E0E10",
  },
  blockquote: {
    backgroundColor: "transparent",
    borderLeftColor: "#55555C",
  },
  table: {
    borderColor: "#34343A",
  },
  tr: {
    borderColor: "#34343A",
  },
  hr: {
    backgroundColor: "#34343A",
  },
  bullet_list_content: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  ordered_list_content: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
});

async function openSafeLink(url: string) {
  const safeUrl = sanitizeMarkdownUrl(url);
  if (!safeUrl) return;
  if (await Linking.canOpenURL(safeUrl)) await Linking.openURL(safeUrl);
}

// Keep links as Text so they stay inside textgroup; Pressable (a View) is laid out
// outside the text flow and collapses the bubble height, overlapping later messages.
const renderRules: RenderRules = {
  link: (node, children, _parent, styleMap) => (
    <Text
      accessibilityRole="link"
      key={node.key}
      style={styleMap.link}
      onPress={() => {
        void openSafeLink(node.attributes.href ?? "");
      }}
    >
      {children}
    </Text>
  ),
};

export const ChatMarkdown = memo(function ChatMarkdown({
  children,
  streaming = false,
}: ChatMarkdownProps) {
  const sharedProps = {
    colorScheme: "dark" as const,
    style: styles,
    rules: renderRules,
    allowedImageHandlers: ["https://", "http://"],
    onLinkPress: (url: string) => {
      void openSafeLink(url);
      return false;
    },
  };

  return (
    <View style={layout.wrap}>
      {streaming ? (
        <MarkdownStream {...sharedProps} cursorColor="#85858A" streaming>
          {children}
        </MarkdownStream>
      ) : (
        <Markdown {...sharedProps}>{children}</Markdown>
      )}
    </View>
  );
});

const layout = StyleSheet.create({
  wrap: {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
});

export type { ChatMarkdownProps } from "./markdown";
