"use client";

import { useCallback, useState } from "react";
import { postKayyisaChat } from "./api";
import { answerKayyisa, type GuideTopic } from "./kayyisaGuide";

export interface KayyisaCitation {
  document: string;
  subject: string;
  phase: string;
  url: string;
}

export interface KayyisaMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  topic: GuideTopic | null;
  citations?: KayyisaCitation[];
}

export const KAYYISA_WELCOME: KayyisaMessage = {
  id: "welcome",
  role: "assistant",
  text: "Halo, saya **Kak Kayyisa**. Saya siap memandu fitur Smartboard — KPI, visualisasi, evaluasi, jadwal, dan honor. Ada yang ingin ditanyakan?",
  topic: null,
};

export function useKayyisaChat() {
  const [messages, setMessages] = useState<KayyisaMessage[]>(() => [
    KAYYISA_WELCOME,
  ]);
  const [busy, setBusy] = useState(false);

  const ask = useCallback(
    async (query: string) => {
      const q = String(query || "").trim();
      if (!q || busy) return;

      const stamp = Date.now();
      setMessages((prev) => [
        ...prev,
        { id: `u-${stamp}`, role: "user", text: q, topic: null },
      ]);
      setBusy(true);

      let text: string | null = null;
      let topic: GuideTopic | null = null;
      let citations: KayyisaCitation[] = [];

      try {
        const data = await postKayyisaChat(q);
        if (data?.ai_assisted && data?.reply) {
          text = data.reply;
          citations = Array.isArray(data.citations) ? data.citations : [];
        }
      } catch {
        // Fallback guide is a real answer — silent on network errors.
      }

      if (!text) {
        const local = answerKayyisa(q);
        text = local.reply;
        topic = local.topic;
      }

      setMessages((prev) => [
        ...prev,
        { id: `a-${stamp}`, role: "assistant", text, topic, citations },
      ]);
      setBusy(false);
    },
    [busy],
  );

  return { messages, busy, ask };
}
