"use client";

// Architected and built by Drferdi.
// Sentraverse Neural - Vera Floating AI Assistant Chat Widget
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome");

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

  const typing = messages.some((m) => m.isStreaming && !m.text);
  const fresh = messages.length === 1;
  const suggesting = input.startsWith("/");
  const suggestions = QUICK_PROMPTS.filter((p) => p.toLowerCase().includes(input.slice(1).trim().toLowerCase()));

  const toggleOpen = () => {
    if (!isOpen) setGreeting(greetingFor(new Date().getHours()));
    setIsOpen(!isOpen);
  };

  const copyAnswer = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard can be unavailable (permissions); the answer stays selectable.
    }
  };

  return (
    <div className="vera-widget-root">
      {isOpen && (
        <div role="dialog" aria-label="Vera chat" className="vera-widget-panel">
          <header className="vera-panel-header">
            <button type="button" className="vera-icon-button" onClick={handleResetChat} aria-label="Restart conversation" title="Restart conversation">
              <Icon size={15}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Icon>
            </button>
            <span className="vera-plan">Vera · <b>Sentraverse</b></span>
            <button type="button" className="vera-icon-button" onClick={() => setIsOpen(false)} aria-label="Close Vera chat" title="Close">
              <Icon size={17}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
            </button>
          </header>

          <div className="vera-panel-body" data-fresh={fresh}>
            {fresh ? (
              <div className="vera-hero">
                <Image className="vera-hero-logo" src="/brand/sentraverse-logo.png" alt="" width={60} height={47} />
                <h2>{greeting}</h2>
                <p>I&apos;m Vera. How can I help you?</p>
              </div>
            ) : (
              messages.filter((m) => m.id !== INITIAL_MESSAGE.id && !(m.isStreaming && !m.text)).map((msg) =>
                msg.sender === "user" ? (
                  <p key={msg.id} className="vera-question">{msg.text}</p>
                ) : (
                  <div key={msg.id} className="vera-answer">
                    <div className="vera-reply">
                      {msg.text}
                      {msg.isStreaming && <span className="vera-caret" aria-hidden="true" />}
                    </div>
                    {!msg.isStreaming && (
                      <div className="vera-meta">
                        <button type="button" onClick={() => copyAnswer(msg)} aria-label="Copy answer" title="Copy">
                          {copiedId === msg.id
                            ? <Icon size={14}><path d="M20 6 9 17l-5-5" /></Icon>
                            : <Icon size={14}><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Icon>}
                        </button>
                        {msg.sources && msg.sources.length > 0 && (
                          <button type="button" className="vera-sources-toggle" onClick={() => setExpandedSourceId(expandedSourceId === msg.id ? null : msg.id)} aria-expanded={expandedSourceId === msg.id}>
                            <span className="vera-count">{msg.sources.length}</span> Sources
                            <span className="vera-chevron" data-open={expandedSourceId === msg.id}><Icon size={13}><path d="m6 9 6 6 6-6" /></Icon></span>
                          </button>
                        )}
                      </div>
                    )}
                    {msg.sources && expandedSourceId === msg.id && (
                      <ul className="vera-sources">
                        {msg.sources.map((res, i) => (
                          <li key={i}>
                            <strong>{res.document_name || res.dataset_name || "Official document"}</strong>
                            {res.score ? <em>{(res.score * 100).toFixed(0)}% relevant</em> : null}
                            {res.content && <p>{res.content}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              )
            )}

            {typing && (
              <div className="vera-typing" role="status" aria-label="Vera is typing">
                <i /><i /><i />
              </div>
            )}

            {errorMessage && (
              <p className="vera-error" role="alert">
                <Icon size={13}><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></Icon> {errorMessage}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (suggesting) {
                if (suggestions[0]) handleSend(suggestions[0]);
                return;
              }
              handleSend();
            }}
            className="vera-panel-footer"
          >
            {suggesting && (
              <ul className="vera-suggestions" role="listbox" aria-label="Suggested questions">
                {suggestions.length ? suggestions.map((prompt) => (
                  <li key={prompt}>
                    <button type="button" role="option" aria-selected="false" onClick={() => handleSend(prompt)}>{prompt}</button>
                  </li>
                )) : <li className="vera-suggestions-empty">No matching suggestions</li>}
              </ul>
            )}
            <div className="vera-composer">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape" && suggesting) { e.stopPropagation(); setInput(""); } }}
                placeholder="Ask about the Sentraverse ecosystem…"
                aria-label="Message for Vera"
                disabled={loading}
              />
              <div className="vera-composer-row">
                <button type="button" className="vera-round-btn" onClick={() => { setInput("/"); inputRef.current?.focus(); }} aria-label="Show suggested questions" title="Suggestions" disabled={loading}>
                  <Icon size={15}><path d="M5 12h14" /><path d="M12 5v14" /></Icon>
                </button>
                <span className="vera-hint">Type <kbd>/</kbd> for suggestions</span>
                {loading ? (
                  <button type="button" onClick={handleStopGenerating} className="vera-send-btn" aria-label="Stop answer" title="Stop">
                    <Icon size={11}><rect x="6" y="6" width="12" height="12" rx="1" /></Icon>
                  </button>
                ) : (
                  <button type="submit" disabled={!input.trim() || (suggesting && !suggestions.length)} className="vera-send-btn" aria-label="Send question" title="Send">
                    <Icon size={16}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></Icon>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        aria-label={isOpen ? "Close Vera chat" : "Open Vera chat"}
        className="vera-widget-trigger"
        data-open={isOpen}
      >
        <span className="vera-launcher-mark" aria-hidden="true">
          {isOpen
            ? <Icon size={14}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
            : <Image src="/brand/sentraverse-logo.png" alt="" width={28} height={22} />}
        </span>
        <span className="vera-launcher-text">{isOpen ? "Close" : "Ask Vera"}</span>
      </button>
    </div>
  );
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Icon({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
