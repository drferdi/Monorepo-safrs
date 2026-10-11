"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Square,
  RotateCcw,
  Maximize2,
  ChevronDown,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
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
  text: "Halo \u{1F44B} Saya Vera. Tanyakan apa saja seputar pedoman klinis dan knowledge base Sentra.",
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (messages.length > 1) scrollToBottom();
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

  const typing = messages.some((m) => m.isStreaming && !m.text);
  const suggesting = input.startsWith("/");
  const suggestions = QUICK_PROMPTS.filter((p) => p.toLowerCase().includes(input.slice(1).trim().toLowerCase()));

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
        <div role="dialog" aria-label="Chat Vera" className="vera-widget-panel">
          <header className="vera-panel-header">
            <span className="vera-avatar" aria-hidden="true">
              <VeraMark size={11} />
            </span>
            <strong className="vera-title">Vera</strong>
            <button type="button" className="vera-icon-button" onClick={handleResetChat} aria-label="Mulai ulang percakapan" title="Mulai ulang percakapan">
              <RotateCcw size={16} />
            </button>
            <a className="vera-icon-button" href="/dify" aria-label="Buka layar penuh" title="Buka layar penuh">
              <Maximize2 size={16} />
            </a>
            <button type="button" className="vera-icon-button" onClick={() => setIsOpen(false)} aria-label="Tutup chat Vera" title="Tutup">
              <X size={18} />
            </button>
          </header>

          <div className="vera-panel-body">
            {messages.filter((m) => !(m.isStreaming && !m.text)).map((msg) =>
              msg.sender === "user" ? (
                <p key={msg.id} className="vera-question">{msg.text}</p>
              ) : (
                <div key={msg.id} className="vera-answer">
                  <div className="vera-bubble">
                    {msg.text}
                    {msg.isStreaming && <span className="vera-caret" aria-hidden="true" />}
                  </div>
                  {msg.id !== "vera-intro" && !msg.isStreaming && (
                    <div className="vera-meta">
                      {msg.resources && msg.resources.length > 0 ? (
                        <button type="button" className="vera-sources-toggle" onClick={() => setExpandedSourceId(expandedSourceId === msg.id ? null : msg.id)} aria-expanded={expandedSourceId === msg.id}>
                          <span className="vera-count">{msg.resources.length}</span> Sumber
                          <ChevronDown size={13} data-open={expandedSourceId === msg.id} />
                        </button>
                      ) : (
                        <span />
                      )}
                      <span className="vera-actions">
                        <button type="button" onClick={() => copyAnswer(msg)} aria-label="Salin jawaban" title="Salin">
                          {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button type="button" onClick={() => handleFeedback(msg.id, "like")} data-active={msg.feedback === "like"} aria-label="Sesuai / membantu" title="Membantu">
                          <ThumbsUp size={14} />
                        </button>
                        <button type="button" onClick={() => handleFeedback(msg.id, "dislike")} data-active={msg.feedback === "dislike"} aria-label="Kurang akurat" title="Kurang akurat">
                          <ThumbsDown size={14} />
                        </button>
                      </span>
                    </div>
                  )}
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
              )
            )}

            {typing && (
              <div className="vera-answer">
                <div className="vera-bubble vera-typing" role="status" aria-label="Vera sedang mengetik">
                  <i /><i /><i />
                </div>
              </div>
            )}

            {errorMessage && (
              <p className="vera-error" role="alert">
                <AlertCircle size={13} /> {errorMessage}
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
              <ul className="vera-suggestions" role="listbox" aria-label="Saran pertanyaan">
                {suggestions.length ? suggestions.map((prompt) => (
                  <li key={prompt}>
                    <button type="button" role="option" aria-selected="false" onClick={() => handleSend(prompt)}>{prompt}</button>
                  </li>
                )) : <li className="vera-suggestions-empty">Tidak ada saran yang cocok</li>}
              </ul>
            )}
            <label className="vera-input-wrap">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape" && suggesting) { e.stopPropagation(); setInput(""); } }}
                aria-label="Pesan untuk Vera"
                disabled={loading}
              />
              {!input && (
                <span className="vera-hint" aria-hidden="true">
                  Ketik <kbd>/</kbd> untuk saran
                </span>
              )}
            </label>
            {loading ? (
              <button type="button" onClick={handleStopGenerating} className="vera-send-btn">
                <Square size={11} /> Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim() || (suggesting && !suggestions.length)} className="vera-send-btn">
                Tanya
              </button>
            )}
          </form>
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
          {isOpen ? <X size={14} /> : <VeraMark size={12} />}
        </span>
        <span className="vera-launcher-text">{isOpen ? "Tutup" : "Tanya Vera"}</span>
      </button>
    </div>
  );
}

function VeraMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M12 2c.8 6.5 3.5 9.2 10 10-6.5.8-9.2 3.5-10 10-.8-6.5-3.5-9.2-10-10 6.5-.8 9.2-3.5 10-10Z" fill="currentColor" />
    </svg>
  );
}
