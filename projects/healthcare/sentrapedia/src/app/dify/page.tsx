"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Square,
  Sparkles,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  ExternalLink,
} from "lucide-react";
import { sendDifyChatMessage, sendDifyMessageFeedback } from "../../lib/dify/client";
import type { DifyAgentThought, DifyRetrieverResource } from "../../lib/dify/types";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  thoughts?: DifyAgentThought[];
  resources?: DifyRetrieverResource[];
  feedback?: "like" | "dislike" | null;
  timestamp: string;
}

export default function DifyChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "assistant",
      text: "Halo, Dok! Saya asisten klinis Dify yang terhubung langsung dengan Sentraverse Knowledge Base. Ada kasus atau pedoman klinis yang ingin ditelaah hari ini?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeThoughts, setActiveThoughts] = useState<DifyAgentThought[]>([]);
  const [expandedThoughtId, setExpandedThoughtId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Apa tatalaksana pencegahan primer stroke menurut AHA/ASA 2024?",
    "Jelaskan kriteria diagnosis Penyakit Paru Obstruktif Kronik (GOLD 2024)",
    "Bagaimana panduan kardiovaskular pada pasien diabetes menurut ESC 2023?",
    "Ringkas pedoman tatalaksana kasus bedah toraks darurat",
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeThoughts, loading]);

  async function handleSend(customText?: string) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || loading) return;

    setInput("");
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: textToSend,
        timestamp: timeStr,
      },
      {
        id: assistantMsgId,
        sender: "assistant",
        text: "",
        thoughts: [],
        resources: [],
        timestamp: timeStr,
      },
    ]);

    setLoading(true);
    setActiveThoughts([]);
    abortControllerRef.current = new AbortController();

    const thoughtsAccumulator: DifyAgentThought[] = [];
    const resourcesAccumulator: DifyRetrieverResource[] = [];

    try {
      await sendDifyChatMessage(
        {
          query: textToSend,
          conversationId,
          user: "drferdi",
        },
        {
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, text: msg.text + chunk } : msg
              )
            );
          },
          onThought: (thought) => {
            thoughtsAccumulator.push(thought);
            setActiveThoughts([...thoughtsAccumulator]);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, thoughts: [...thoughtsAccumulator] }
                  : msg
              )
            );
          },
          onResource: (resources) => {
            resourcesAccumulator.push(...resources);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, resources: [...resourcesAccumulator] }
                  : msg
              )
            );
          },
          onEnd: (final) => {
            setConversationId(final.conversationId);
          },
          onError: (err) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      text: msg.text + `\n\n*[Peringatan: ${err.message}]*`,
                    }
                  : msg
              )
            );
          },
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Dify chat error:", err);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }

  async function handleFeedback(messageId: string, rating: "like" | "dislike") {
    try {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
      );
      await sendDifyMessageFeedback({
        messageId,
        rating,
        user: "drferdi",
      });
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8f9fa", color: "#232326", fontFamily: "var(--font-geist, sans-serif)" }}>
      {/* Header bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#ffffff", borderBottom: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", color: "#4b5563", textDecoration: "none", background: "#f3f4f6" }}>
            <ArrowLeft size={14} />
            <span>Kembali ke Workspace</span>
          </Link>
          <div style={{ height: "18px", width: "1px", background: "#e5e7eb" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#0ea5e9", color: "#ffffff" }}>
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px", lineHeight: "1.2" }}>Dify Clinical Agent</div>
              <div style={{ fontSize: "11px", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Connected to Sentraverse Knowledge
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6b7280" }}>
          <span style={{ padding: "4px 8px", background: "#f3f4f6", borderRadius: "4px" }}>Streaming SSE</span>
          {conversationId && (
            <span style={{ padding: "4px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: "4px", fontSize: "11px" }}>
              Session: {conversationId.slice(0, 8)}...
            </span>
          )}
        </div>
      </header>

      {/* Chat Messages Viewport */}
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <div style={{ maxWidth: "840px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.sender === "assistant" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#0284c7", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <Bot size={16} />
                </div>
              )}

              <div
                style={{
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                {/* Agent Thoughts / Reasoning Tool Calls */}
                {msg.sender === "assistant" && msg.thoughts && msg.thoughts.length > 0 && (
                  <div style={{ width: "100%", marginBottom: "4px" }}>
                    {msg.thoughts.map((th) => (
                      <div
                        key={th.id}
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "12px",
                          color: "#166534",
                          marginBottom: "6px",
                        }}
                      >
                        <div
                          onClick={() => setExpandedThoughtId(expandedThoughtId === th.id ? null : th.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontWeight: 500 }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Sparkles size={13} color="#16a34a" />
                            {th.thought || `Tool: ${th.tool}`}
                          </span>
                          {expandedThoughtId === th.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>

                        {expandedThoughtId === th.id && (
                          <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #bbf7d0", fontSize: "11px", color: "#14532d" }}>
                            <div><strong>Input:</strong> {th.tool_input}</div>
                            {th.observation && <div style={{ marginTop: "4px" }}><strong>Observation:</strong> {th.observation}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: msg.sender === "user" ? "#1e293b" : "#ffffff",
                    color: msg.sender === "user" ? "#ffffff" : "#1f2937",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    border: msg.sender === "assistant" ? "1px solid #e5e7eb" : "none",
                    lineHeight: "1.6",
                    fontSize: "14px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text || (loading && msg.sender === "assistant" ? "Sedang menelaah pengetahuan..." : "")}
                </div>

                {/* Citations / Retriever Resources */}
                {msg.sender === "assistant" && msg.resources && msg.resources.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%", marginTop: "4px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                      <BookOpen size={12} /> Referensi Knowledge Base:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {msg.resources.map((res, idx) => (
                        <div
                          key={idx}
                          title={res.content}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 8px",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: "#1d4ed8",
                          }}
                        >
                          <span>{res.document_name}</span>
                          <span style={{ fontSize: "10px", color: "#60a5fa" }}>({Math.round(res.score * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer bar under message */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "#9ca3af", padding: "0 2px" }}>
                  <span>{msg.timestamp}</span>
                  {msg.sender === "assistant" && msg.text && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "4px" }}>
                      <button
                        onClick={() => handleFeedback(msg.id, "like")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: msg.feedback === "like" ? "#16a34a" : "#9ca3af", padding: "2px" }}
                        title="Bagus / Akurat"
                      >
                        <ThumbsUp size={12} />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, "dislike")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: msg.feedback === "dislike" ? "#dc2626" : "#9ca3af", padding: "2px" }}
                        title="Kurang Tepat"
                      >
                        <ThumbsDown size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {msg.sender === "user" && (
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#475569", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>
      </main>

      {/* Suggested Quick Prompts (if chat is short) */}
      {messages.length <= 3 && !loading && (
        <div style={{ padding: "0 20px 8px 20px", maxWidth: "840px", margin: "0 auto", width: "100%", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "20px",
                color: "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                textAlign: "left",
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input Bar */}
      <footer style={{ padding: "16px 20px 20px 20px", background: "#ffffff", borderTop: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: "840px", margin: "0 auto", display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Tanyakan pedoman klinis, interaksi obat, atau kasus medis ke Dify Agent..."
            rows={2}
            style={{
              flex: 1,
              resize: "none",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
              color: "#1f2937",
              background: "#ffffff",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
            }}
          />

          {loading ? (
            <button
              onClick={handleStop}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 18px",
                borderRadius: "10px",
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                fontWeight: 500,
                fontSize: "13px",
                cursor: "pointer",
                height: "44px",
              }}
            >
              <Square size={14} fill="#ffffff" />
              <span>Hentikan</span>
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "12px 20px",
                borderRadius: "10px",
                background: input.trim() ? "#0284c7" : "#e5e7eb",
                color: input.trim() ? "#ffffff" : "#9ca3af",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: input.trim() ? "pointer" : "not-allowed",
                height: "44px",
                transition: "background 150ms ease",
              }}
            >
              <Send size={14} />
              <span>Kirim</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
