"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Send,
  Square,
  RotateCcw,
  ChevronLeft,
  ChevronDown,
  MoreVertical,
  Smile,
  MessageSquareText,
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
  text: "Halo! Saya Vera, asisten AI resmi Sentraverse & Sentrapedia. Ada kasus, pedoman klinis, atau referensi knowledge base yang ingin Anda telaah hari ini?",
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    setMenuOpen(false);
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

  const typing = messages.some((m) => m.isStreaming && !m.text);

  return (
    <div className="vera-widget-root">
      {isOpen && (
        <div role="dialog" aria-label="Chat Vera" className="vera-widget-panel">
          <header className="vera-panel-header">
            <button type="button" className="vera-icon-button" onClick={() => setIsOpen(false)} aria-label="Tutup chat Vera">
              <ChevronLeft size={22} />
            </button>
            <span className="vera-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2c.8 6.5 3.5 9.2 10 10-6.5.8-9.2 3.5-10 10-.8-6.5-3.5-9.2-10-10 6.5-.8 9.2-3.5 10-10Z" fill="currentColor" /></svg>
            </span>
            <span className="vera-title">
              <strong>Vera</strong>
              <small>Asisten pengetahuan Sentra</small>
            </span>
            <span className="vera-menu">
              <button type="button" className="vera-icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu chat" aria-expanded={menuOpen}>
                <MoreVertical size={20} />
              </button>
              {menuOpen && (
                <span className="vera-menu-list" role="menu">
                  <button type="button" role="menuitem" onClick={handleResetChat}>
                    <RotateCcw size={14} /> Mulai ulang percakapan
                  </button>
                </span>
              )}
            </span>
          </header>

          <div className="vera-sheet">
            {errorMessage && (
              <div className="vera-error" role="alert">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="vera-panel-body">
              <span className="vera-day">Hari ini</span>
              {messages.filter((m) => !(m.isStreaming && !m.text)).map((msg) => (
                <div key={msg.id} className={`vera-msg-row ${msg.sender}`}>
                  <div className={`vera-bubble ${msg.sender}`}>
                    {msg.text}
                    {msg.isStreaming && <span className="vera-caret" aria-hidden="true" />}
                  </div>
                  <div className="vera-meta">
                    <span>{msg.timestamp}</span>
                    {msg.sender === "assistant" && !msg.isStreaming && msg.id !== "vera-intro" && (
                      <>
                        <button type="button" onClick={() => handleFeedback(msg.id, "like")} data-active={msg.feedback === "like"} aria-label="Sesuai / membantu">
                          <ThumbsUp size={12} />
                        </button>
                        <button type="button" onClick={() => handleFeedback(msg.id, "dislike")} data-active={msg.feedback === "dislike"} aria-label="Kurang akurat">
                          <ThumbsDown size={12} />
                        </button>
                      </>
                    )}
                    {msg.resources && msg.resources.length > 0 && (
                      <button type="button" className="vera-sources-toggle" onClick={() => setExpandedSourceId(expandedSourceId === msg.id ? null : msg.id)} aria-expanded={expandedSourceId === msg.id}>
                        <FileText size={12} /> {msg.resources.length} sumber
                        <ChevronDown size={12} data-open={expandedSourceId === msg.id} />
                      </button>
                    )}
                  </div>
                  {msg.resources && expandedSourceId === msg.id && (
                    <ul className="vera-sources">
                      {msg.resources.map((res, i) => (
                        <li key={i}>
                          <strong>{res.document_name || res.dataset_name || "Dokumen resmi"}</strong>
                          {res.score ? <em>{(res.score * 100).toFixed(0)}% relevan</em> : null}
                          {res.content && <p>{res.content}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {typing && (
                <div className="vera-msg-row assistant">
                  <div className="vera-bubble assistant vera-typing" role="status" aria-label="Vera sedang mengetik">
                    <i /><i /><i />
                  </div>
                  <div className="vera-meta"><span>Vera mengetik…</span></div>
                </div>
              )}

              {messages.length === 1 && !loading && (
                <div className="vera-prompts">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => handleSend(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="vera-panel-footer"
            >
              <label className="vera-input-wrap">
                <Smile size={22} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pesan"
                  aria-label="Pesan untuk Vera"
                  disabled={loading}
                />
              </label>
              {loading ? (
                <button type="button" onClick={handleStopGenerating} aria-label="Hentikan jawaban" className="vera-send-btn">
                  <Square size={16} />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Kirim pesan" className="vera-send-btn">
                  <Send size={17} />
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Tutup chat Vera" : "Buka chat Vera"}
        className="vera-widget-trigger"
        data-open={isOpen}
      >
        <span className="vera-launcher-mark" aria-hidden="true">
          {isOpen ? <X size={18} /> : <MessageSquareText size={18} />}
        </span>
        <span className="vera-launcher-text">{isOpen ? "Tutup" : "Tanya Vera"}</span>
      </button>
    </div>
  );
}
