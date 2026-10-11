"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Send,
  Square,
  RotateCcw,
  Bot,
  ChevronDown,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  FileText,
} from "lucide-react";
import { sendDifyChatMessage, sendDifyMessageFeedback } from "../lib/dify/client";
import type { DifyRetrieverResource } from "../lib/dify/types";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  resources?: DifyRetrieverResource[];
  feedback?: "like" | "dislike" | null;
  timestamp: string;
  isStreaming?: boolean;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "vera-intro",
  sender: "assistant",
  text: "Halo! Saya **Vera**, asisten AI resmi Sentraverse & Sentrapedia. Ada kasus, pedoman klinis, atau referensi knowledge base yang ingin Anda telaah hari ini?",
  timestamp: "Sekarang",
};

const QUICK_PROMPTS = [
  "Apa peran Sentraverse dalam ekosistem Sentra?",
  "Jelaskan 7 protokol klinis diagnostic support",
  "Kriteria diagnosis PPOK (GOLD 2024)",
  "Bagaimana kepatuhan SATUSEHAT & privasi data?",
];

let msgSeq = 0;
function createId(prefix: string): string {
  msgSeq += 1;
  return `${prefix}-${Date.now()}-${msgSeq}`;
}

export function VeraWidget() {
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

  // Escape key to close
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

    const userMsgId = createId("user");
    const assistantMsgId = createId("vera");
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
      let accumulatedText = "";
      let capturedResources: DifyRetrieverResource[] = [];

      await sendDifyChatMessage(
        {
          query: promptText,
          conversationId,
          user: "sentrapedia-clinician",
        },
        {
          onChunk: (chunk: string) => {
            accumulatedText += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, text: accumulatedText, isStreaming: true }
                  : m
              )
            );
          },
          onResource: (resources: DifyRetrieverResource[]) => {
            capturedResources = resources;
          },
          onEnd: (final) => {
            if (final.conversationId) setConversationId(final.conversationId);
            if (final.metadata?.retriever_resources) {
              capturedResources = final.metadata.retriever_resources;
            }
          },
          onError: (err) => {
            throw new Error(err.message);
          },
        },
        {
          signal: abortController.signal,
        }
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                text: accumulatedText || "Terima kasih atas pertanyaan Anda.",
                resources: capturedResources.length > 0 ? capturedResources : undefined,
                isStreaming: false,
              }
            : m
        )
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, isStreaming: false }
              : m
          )
        );
      } else {
        const errorText = err instanceof Error ? err.message : "Gagal menghubungi Vera Agent.";
        setErrorMessage(errorText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: "Maaf, terjadi kendala saat menghubungi Vera Agent. Silakan coba lagi.",
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

  const handleFeedback = async (messageId: string, rating: "like" | "dislike") => {
    try {
      await sendDifyMessageFeedback({
        messageId,
        rating,
        user: "sentrapedia-clinician",
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
      );
    } catch {
      // Ignored
    }
  };

  return (
    <div className="vera-widget-root">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div role="dialog" aria-label="Vera AI Chat Assistant" className="vera-widget-panel">
          {/* Header */}
          <div className="vera-panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="vera-icon-badge">
                <Sparkles size={14} />
                <span className="vera-pulse-dot" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", letterSpacing: "0.2px" }}>
                    Vera
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      background: "rgba(64, 224, 208, 0.2)",
                      color: "#40e0d0",
                      fontWeight: 500,
                    }}
                  >
                    AI Assistant
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#a4aec0", marginTop: "2px" }}>
                  Dify Cloud KB Connected
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Percakapan"
                style={{ padding: "6px", color: "#a4aec0", borderRadius: "6px" }}
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup Widget"
                style={{ padding: "6px", color: "#a4aec0", borderRadius: "6px" }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                padding: "8px 14px",
                background: "#fef2f2",
                borderBottom: "1px solid #fee2e2",
                color: "#b91c1c",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, color: "#ef4444" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {errorMessage}
              </span>
            </div>
          )}

          {/* Messages Body */}
          <div className="vera-panel-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`vera-msg-row ${msg.sender}`}>
                <div className={`vera-bubble ${msg.sender}`}>
                  {msg.sender === "assistant" && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#086b61",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Bot size={13} />
                        <span>Vera</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "#a4aec0", fontWeight: 400 }}>
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
                        background: "#40e0d0",
                        animation: "fade-in 0.8s infinite alternate",
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                </div>

                {/* Assistant Feedback & Citations */}
                {msg.sender === "assistant" && !msg.isStreaming && msg.id !== "vera-intro" && (
                  <div
                    style={{
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "10px",
                      color: "#667085",
                      padding: "0 4px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleFeedback(msg.id, "like")}
                      style={{
                        color: msg.feedback === "like" ? "#086b61" : "#667085",
                        cursor: "pointer",
                      }}
                      title="Sesuai / Membantu"
                    >
                      <ThumbsUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback(msg.id, "dislike")}
                      style={{
                        color: msg.feedback === "dislike" ? "#b91c1c" : "#667085",
                        cursor: "pointer",
                      }}
                      title="Kurang Akurat"
                    >
                      <ThumbsDown size={11} />
                    </button>
                  </div>
                )}

                {/* Sources / Citations */}
                {msg.resources && msg.resources.length > 0 && (
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
                        color: "#086b61",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                      }}
                    >
                      <FileText size={12} />
                      <span>{msg.resources.length} Sumber Referensi Terverifikasi</span>
                      <ChevronDown
                        size={12}
                        style={{
                          transform: expandedSourceId === msg.id ? "rotate(180deg)" : "none",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </button>

                    {expandedSourceId === msg.id && (
                      <div
                        style={{
                          marginTop: "6px",
                          padding: "8px",
                          background: "#f4f4f5",
                          border: "1px solid #e4e4e7",
                          borderRadius: "8px",
                          fontSize: "11px",
                        }}
                      >
                        {msg.resources.map((res, i) => (
                          <div
                            key={i}
                            style={{
                              borderBottom:
                                i === (msg.resources?.length ?? 1) - 1 ? "none" : "1px solid #e4e4e7",
                              paddingBottom: "6px",
                              marginBottom: "6px",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 500,
                                color: "#232326",
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
                                {res.document_name || res.dataset_name || "Dokumen Resmi"}
                              </span>
                              {res.score && (
                                <span style={{ fontSize: "10px", color: "#086b61", marginLeft: "8px" }}>
                                  {(res.score * 100).toFixed(0)}% relevan
                                </span>
                              )}
                            </div>
                            {res.content && (
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "#53565b",
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
                    color: "#667085",
                    marginBottom: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <BookOpen size={12} />
                  <span>Pertanyaan Cepat:</span>
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
                        background: "#ffffff",
                        border: "1px solid #e4e4e7",
                        color: "#53565b",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
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
            className="vera-panel-footer"
          >
            <div className="vera-input-wrap">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya Vera seputar pedoman klinis..."
                disabled={loading}
              />
              {loading ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  title="Hentikan Jawaban"
                  className="vera-send-btn"
                  style={{ background: "#8a8f98" }}
                >
                  <Square size={13} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Kirim Pesan"
                  className="vera-send-btn"
                >
                  <Send size={13} />
                </button>
              )}
            </div>
            <div style={{ marginTop: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#8a8f98" }}>
                Vera AI Agent • Sentraverse Official Intelligence
              </span>
            </div>
          </form>
        </div>
      )}

      {/* FLOATING TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Tutup chat Vera" : "Buka chat Vera Agent"}
        className="vera-widget-trigger"
        data-open={isOpen}
      >
        <span className="vera-launcher-mark" aria-hidden="true">
          {isOpen ? <X size={15} /> : <Sparkles size={15} />}
        </span>
        <span className="vera-launcher-text">
          <strong>{isOpen ? "Tutup" : "Tanya Vera"}</strong>
          {!isOpen && <small>Asisten pengetahuan Sentra</small>}
        </span>
      </button>
    </div>
  );
}
