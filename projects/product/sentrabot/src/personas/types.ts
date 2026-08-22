export const PERSONA_CATEGORY = {
  PRIBADI: "pribadi",
  BISNIS: "bisnis",
  PROFESIONAL: "profesional",
  PENDIDIKAN: "pendidikan",
  TEKNIS: "teknis",
} as const satisfies Record<string, string>;

export type PersonaCategory =
  (typeof PERSONA_CATEGORY)[keyof typeof PERSONA_CATEGORY];

export interface SentraBotPersona {
  id: string;
  name: string;
  title: string;
  description: string;
  category: PersonaCategory;
  /** Ringkasan singkat untuk kartu UI */
  tagline: string;
  /** Contoh prompt pertama kali */
  starterPrompt: string;
  /** Instruksi sistem lengkap — Bahasa Indonesia */
  instructions: string;
  /** Zona waktu default untuk rutinitas */
  timezone: string;
  /** Contoh rutinitas cron (nama + prompt) */
  suggestedRoutines: ReadonlyArray<{
    name: string;
    prompt: string;
    cronHint: string;
  }>;
}
