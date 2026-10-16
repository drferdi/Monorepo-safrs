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
  ArrowUp,
  Plus,
} from "lucide-react";
import Image from "next/image";
import officialLogo from "../assets/sentra-official-logo.png";
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
  const [greeting, setGreeting] = useState("Selamat datang");

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
        <div role="dialog" aria-label="Chat Vera" className="vera-widget-panel">
          <header className="vera-panel-header">
            <button type="button" className="vera-icon-button" onClick={handleResetChat} aria-label="Mulai ulang percakapan" title="Mulai ulang percakapan">
              <RotateCcw size={15} />
            </button>
            <span className="vera-plan">Vera · <b>TheOracle</b></span>
            <span className="vera-header-actions">
              <a className="vera-icon-button" href="/dify" aria-label="Buka layar penuh" title="Buka layar penuh">
                <Maximize2 size={15} />
              </a>
              <button type="button" className="vera-icon-button" onClick={() => setIsOpen(false)} aria-label="Tutup chat Vera" title="Tutup">
                <X size={17} />
              </button>
            </span>
          </header>

          <div className="vera-panel-body" data-fresh={fresh}>
            {fresh ? (
              <div className="vera-hero">
                <span className="vera-hero-logo" aria-hidden="true">
                  <Image src={officialLogo} alt="" width={48} height={36} unoptimized />
                </span>
                <h2>{greeting}, Dokter</h2>
                <p>Saya Vera. Ada yang bisa Vera bantu?</p>
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
                        <button type="button" onClick={() => copyAnswer(msg)} aria-label="Salin jawaban" title="Salin">
                          {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button type="button" onClick={() => handleFeedback(msg.id, "like")} data-active={msg.feedback === "like"} aria-label="Sesuai / membantu" title="Membantu">
                          <ThumbsUp size={14} />
                        </button>
                        <button type="button" onClick={() => handleFeedback(msg.id, "dislike")} data-active={msg.feedback === "dislike"} aria-label="Kurang akurat" title="Kurang akurat">
                          <ThumbsDown size={14} />
                        </button>
                        {msg.resources && msg.resources.length > 0 && (
                          <button type="button" className="vera-sources-toggle" onClick={() => setExpandedSourceId(expandedSourceId === msg.id ? null : msg.id)} aria-expanded={expandedSourceId === msg.id}>
                            <span className="vera-count">{msg.resources.length}</span> Sumber
                            <ChevronDown size={13} data-open={expandedSourceId === msg.id} />
                          </button>
                        )}
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
              )
            )}

            {typing && (
              <div className="vera-typing" role="status" aria-label="Vera sedang mengetik">
                <i /><i /><i />
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
              <ul className="vera-suggestions" aria-label="Saran pertanyaan">
                {suggestions.length ? suggestions.map((prompt) => (
                  <li key={prompt}>
                    <button type="button" onClick={() => handleSend(prompt)}>{prompt}</button>
                  </li>
                )) : <li className="vera-suggestions-empty">Tidak ada saran yang cocok</li>}
              </ul>
            )}
            <div className="vera-composer">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape" && suggesting) { e.stopPropagation(); setInput(""); } }}
                placeholder="Tulis pertanyaan klinis…"
                aria-label="Pesan untuk Vera"
                disabled={loading}
              />
              <div className="vera-composer-row">
                <button type="button" className="vera-round-btn" onClick={() => { setInput("/"); inputRef.current?.focus(); }} aria-label="Tampilkan saran pertanyaan" title="Saran pertanyaan" disabled={loading}>
                  <Plus size={15} />
                </button>
                <span className="vera-hint">Ketik <kbd>/</kbd> untuk saran</span>
                {loading ? (
                  <button type="button" onClick={handleStopGenerating} className="vera-send-btn" aria-label="Hentikan jawaban" title="Stop">
                    <Square size={11} />
                  </button>
                ) : (
                  <button type="submit" disabled={!input.trim() || (suggesting && !suggestions.length)} className="vera-send-btn" aria-label="Kirim pertanyaan" title="Kirim">
                    <ArrowUp size={16} />
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
        aria-label={isOpen ? "Tutup chat Vera" : "Buka chat Vera"}
        className="vera-widget-trigger"
        data-open={isOpen}
      >
        <span className="vera-launcher-mark" aria-hidden="true">
          {isOpen ? <X size={14} /> : <Image src={officialLogo} alt="" width={26} height={20} unoptimized />}
        </span>
        <span className="vera-launcher-text">{isOpen ? "Tutup" : "Tanya Vera"}</span>
      </button>
    </div>
  );
}

function greetingFor(hour: number): string {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}
