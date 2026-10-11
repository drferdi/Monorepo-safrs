"use client";

// Architected and built by Drferdi.
// Sentraverse Neural - Vera Floating AI Assistant Chat Widget
import React, { useState, useRef, useEffect, useCallback } from "react";

interface CitationSource {
  position?: number;
  dataset_name?: string;
  document_name?: string;
  score?: number;
  content?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: CitationSource[];
  timestamp: string;
  isStreaming?: boolean;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "vera-intro",
  sender: "assistant",
  text: "Hello! I'm **Vera**, the official AI Assistant for the Sentraverse Neural Ecosystem. How can I guide you through our neural clinical architecture and platform today?",
  timestamp: "Now",
};

const QUICK_PROMPTS = [
  "Jelaskan arsitektur neural Sentraverse",
  "Bagaimana 7 protokol klinis berinteraksi?",
  "Apa perbedaan Sentraverse vs SIMRS konvensional?",
  "Bagaimana kepatuhan SATUSEHAT & privasi data?",
];

let msgSeq = 0;
function createMessageId(prefix: string): string {
  msgSeq += 1;
  return `${prefix}-${Date.now()}-${msgSeq}`;
}

async function streamFromVeraApi({
  prompt,
  conversationId,
  onChunk,
  onEnd,
  signal,
}: {
  prompt: string;
  conversationId?: string;
  onChunk: (chunk: string, convId?: string) => void;
  onEnd: (convId?: string, sources?: CitationSource[]) => void;
  signal: AbortSignal;
}) {
  const response = await fetch("/api/vera/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: prompt,
      conversation_id: conversationId || undefined,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming response body is missing");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalConvId = conversationId;
  let finalSources: CitationSource[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;

      const dataString = trimmed.replace(/^data:\s*/, "");
      if (dataString === "[DONE]") continue;

      try {
        const parsed = JSON.parse(dataString);

        if (parsed.event === "message" || parsed.event === "agent_message") {
          if (parsed.conversation_id) {
            finalConvId = parsed.conversation_id;
          }
          if (parsed.answer) {
            onChunk(parsed.answer, finalConvId);
          }
        } else if (parsed.event === "message_end") {
          if (parsed.conversation_id) {
            finalConvId = parsed.conversation_id;
          }
          if (parsed.metadata?.retriever_resources) {
            finalSources = parsed.metadata.retriever_resources;
          }
        } else if (parsed.event === "error") {
          throw new Error(parsed.message || "Error occurred during streaming");
        }
      } catch {
        // SSE heartbeat or ping
      }
    }
  }

  onEnd(finalConvId, finalSources);
}

export function VeraNeuralWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, scrollToBottom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleResetChat = () => {
    if (loading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([INITIAL_MESSAGE]);
    setConversationId(undefined);
    setErrorMessage(null);
    setInput("");
    setLoading(false);
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || loading) return;

    setInput("");
    setErrorMessage(null);

    const userMsgId = createMessageId("user");
    const assistantMsgId = createMessageId("vera");
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: promptText, timestamp: nowTime },
      { id: assistantMsgId, sender: "assistant", text: "", isStreaming: true, timestamp: nowTime },
    ]);
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await streamFromVeraApi({
        prompt: promptText,
        conversationId,
        signal: abortController.signal,
        onChunk: (chunkText, convId) => {
          if (convId) setConversationId(convId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, text: m.text + chunkText, isStreaming: true }
                : m
            )
          );
        },
        onEnd: (convId, sources) => {
          if (convId) setConversationId(convId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    sources: sources && sources.length > 0 ? sources : undefined,
                    isStreaming: false,
                  }
                : m
            )
          );
        },
      });
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          )
        );
      } else {
        const errorText = err instanceof Error ? err.message : "Failed to connect to Vera.";
        setErrorMessage(errorText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: "Sorry, an issue occurred connecting to Vera Agent. Please try again.",
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="neural-vera-widget-root">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div role="dialog" aria-label="Vera AI Chat Assistant" className="neural-vera-widget-panel">
          {/* Header */}
          <div className="neural-vera-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="neural-vera-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                </svg>
                <span className="neural-vera-pulse-dot" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", letterSpacing: "0.3px", color: "#ffffff" }}>
                    Vera
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      background: "rgba(0, 229, 255, 0.18)",
                      color: "#00e5ff",
                      fontWeight: 500,
                      border: "1px solid rgba(0, 229, 255, 0.3)",
                    }}
                  >
                    Neural AI
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#8ea2b8", marginTop: "2px" }}>
                  Dify Cloud KB Connected
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Conversation"
                style={{ padding: "6px", color: "#8ea2b8", borderRadius: "6px", background: "none", border: "none", cursor: "pointer" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Widget"
                style={{ padding: "6px", color: "#8ea2b8", borderRadius: "6px", background: "none", border: "none", cursor: "pointer" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: "8px 14px",
                background: "rgba(185, 28, 28, 0.2)",
                borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {errorMessage}
              </span>
            </div>
          )}

          {/* Messages Body */}
          <div className="neural-vera-panel-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`neural-vera-msg-row ${msg.sender}`}>
                <div className={`neural-vera-bubble ${msg.sender}`}>
                  {msg.sender === "assistant" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#00e5ff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>Vera</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "#6e8399", fontWeight: 400 }}>
                        {msg.timestamp}
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: "13px" }}>{msg.text}</div>

                  {msg.isStreaming && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "6px",
                        height: "12px",
                        marginLeft: "4px",
                        background: "#00e5ff",
                        animation: "neural-fade-in 0.8s infinite alternate",
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                </div>

                {/* Sources / Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: "6px", maxWidth: "86%", textAlign: "left" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSourceId(expandedSourceId === msg.id ? null : msg.id)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "#00e5ff",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                      }}
                    >
                      <span>📚 {msg.sources.length} Verified Sources</span>
                    </button>

                    {expandedSourceId === msg.id && (
                      <div
                        style={{
                          marginTop: "6px",
                          padding: "8px 10px",
                          background: "rgba(18, 26, 38, 0.95)",
                          border: "1px solid rgba(0, 229, 255, 0.2)",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      >
                        {msg.sources.map((res, i) => (
                          <div
                            key={i}
                            style={{
                              borderBottom:
                                i === (msg.sources?.length ?? 1) - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                              paddingBottom: "6px",
                              marginBottom: "6px",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 500,
                                color: "#e5e9ee",
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {res.document_name || res.dataset_name || "Official Knowledge"}
                              </span>
                              {res.score && (
                                <span style={{ fontSize: "10px", color: "#00e5ff", marginLeft: "8px" }}>
                                  {(res.score * 100).toFixed(0)}% match
                                </span>
                              )}
                            </div>
                            {res.content && (
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#8ea2b8",
                                  marginTop: "3px",
                                  lineHeight: 1.4,
                                }}
                              >
                                {res.content}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Quick Prompts */}
            {messages.length === 1 && !loading && (
              <div style={{ paddingTop: "8px" }}>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#8ea2b8",
                    marginBottom: "6px",
                  }}
                >
                  Explore Topics:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      style={{
                        textAlign: "left",
                        fontSize: "12px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "rgba(18, 26, 38, 0.7)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#c2d1e0",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="neural-vera-panel-footer"
          >
            <div className="neural-vera-input-wrap">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Vera about the neural ecosystem..."
                disabled={loading}
              />
              {loading ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  title="Stop Response"
                  className="neural-vera-send-btn"
                  style={{ background: "#475569", color: "#ffffff" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send Message"
                  className="neural-vera-send-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
            <div style={{ marginTop: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#64748b" }}>
                Vera AI Agent • Sentraverse Official Neural Intelligence
              </span>
            </div>
          </form>
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close Vera chat" : "Open Vera chat"}
        className="neural-vera-widget-trigger"
      >
        <div className="neural-vera-icon-badge">
          {isOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          )}
          {!isOpen && <span className="neural-vera-pulse-dot" />}
        </div>
        <span>{isOpen ? "Close Vera" : "Ask Vera"}</span>
      </button>
    </div>
  );
}
