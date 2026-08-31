import type { MessageBlock } from "@sentrabot/contracts";

/**
 * Copy the deployment itself sends over the phone channel (WhatsApp/iMessage).
 * Indonesian is the default because the WhatsApp surface targets Indonesian
 * users; deployments elsewhere set PHONE_LOCALE=en. This covers only the
 * deployment's own words — agent replies follow the user's own language.
 */
export type PhoneLocale = "id" | "en";

export function normalizePhoneLocale(value: string | undefined): PhoneLocale {
  return value === "en" ? "en" : "id";
}

export interface PhoneStrings {
  /** A voice note arrived but no transcription credential is configured. */
  voiceUnavailable: string;
  /** The file type is not one the agent can read. */
  unsupportedMedia: string;
  /** Attachment past the 10 MiB cap. */
  mediaTooLarge: string;
  /** Download or transcription failed for a reason the user cannot fix. */
  mediaFailed: string;
  /** Marks a transcribed voice note in the thread and to the agent. */
  voicePrefix: string;
  /** Prefix on the numbered reply instructions of an approval card. */
  askReplyPrompt: string;
  /** Answer confirmations, keyed by the approval action that was chosen. */
  askConfirmed: Record<"allow" | "always" | "deny", string>;
  /** Approvals that must not be answered by text (secrets, free-form input). */
  askOpenApp: string;
  /** Replies to a WhatsApp pairing code, keyed by the pairing outcome. */
  pairing: Record<"paired" | "invalid" | "conflict-number" | "conflict-bot", string>;
  /** Owner-command confirmations for group channels and agent connections. */
  channelJoined: string;
  channelDeclined: string;
  channelLeft: string;
  connectionApproved: string;
  connectionDeclined: string;
  connectionAccepted: string;
  /** `{name}` is the group's name. */
  channelInvite: string;
  /** In-thread note mirroring the invite; `{name}` is the group's name. */
  channelInviteNote: string;
  /** Posted once into a group that still has unlinked participants. */
  channelIntro: string;
}

/** Fill `{name}`-style holes in a phone string. */
export function formatPhoneString(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
}

const STRINGS: Record<PhoneLocale, PhoneStrings> = {
  id: {
    voiceUnavailable:
      "Maaf, saya belum bisa memproses pesan suara di sini. Silakan kirim sebagai teks dulu.",
    unsupportedMedia:
      "Maaf, jenis file itu belum didukung. Coba kirim foto, PDF, atau file teks (txt, csv, json).",
    mediaTooLarge: "Maaf, filenya terlalu besar (maksimal 10 MB).",
    mediaFailed: "Maaf, file itu gagal saya proses. Coba kirim ulang.",
    voicePrefix: "🎤",
    askReplyPrompt: "Balas dengan angka:",
    askConfirmed: {
      allow: "Baik, saya lanjutkan.",
      always: "Baik, saya lanjutkan dan tidak akan bertanya lagi untuk tindakan ini.",
      deny: "Baik, tidak saya lanjutkan.",
    },
    askOpenApp: "Ada yang perlu Anda isi sendiri. Silakan buka Sentra di web untuk melanjutkan.",
    pairing: {
      paired: "WhatsApp terpasang. Agent Anda siap — silakan kirim pesan.",
      invalid:
        "Kode pemasangan itu tidak valid atau sudah kedaluwarsa. Buat kode baru di Pengaturan.",
      "conflict-number": "Nomor WhatsApp ini sudah terpasang.",
      "conflict-bot":
        "Agent itu sudah punya nomor terpasang. Lepaskan dulu di Pengaturan sebelum memasang yang baru.",
    },
    channelJoined: "Siap — agent Anda sekarang bisa melihat dan membalas di grup itu.",
    channelDeclined: "Baik, agent Anda tidak akan ikut di grup itu.",
    channelLeft:
      "Anda sudah keluar dari kanal itu; agent Anda tidak akan menulis di sana lagi. Grup iMessage-nya sendiri tidak berubah. Deployment ini tidak bisa mengeluarkan nomor dari grup, jadi keluar hanya menghentikan partisipasi agent Anda.",
    connectionApproved: "Koneksi disetujui — agent Anda sekarang bisa saling berkirim pesan.",
    connectionDeclined: "Koneksi ditolak.",
    connectionAccepted:
      "Permintaan koneksi Anda diterima — agent Anda sekarang bisa saling berkirim pesan.",
    channelInvite:
      '"{name}" ditautkan ke nomor Sentra Bot Anda. Balas YES agar agent Anda ikut di percakapan itu, atau NO untuk tidak ikut.',
    channelInviteNote:
      'Anda ditambahkan ke grup iMessage "{name}". Balas YES di percakapan ini untuk ikut bersama agent Anda.',
    channelIntro:
      "Halo — nomor ini menjalankan agent pribadi Sentra Bot. Sebagian orang di grup ini belum pernah mengirim pesan ke nomor ini; kirim pesan apa saja ke nomor ini dulu bila Anda ingin punya agent sendiri di sini.",
  },
  en: {
    voiceUnavailable: "Sorry, I can't process voice messages here yet. Please send text instead.",
    unsupportedMedia:
      "Sorry, that file type isn't supported yet. Try a photo, a PDF, or a text file (txt, csv, json).",
    mediaTooLarge: "Sorry, that file is too large (10 MB maximum).",
    mediaFailed: "Sorry, I couldn't process that file. Please try sending it again.",
    voicePrefix: "🎤",
    askReplyPrompt: "Reply with a number:",
    askConfirmed: {
      allow: "Got it — going ahead.",
      always: "Got it — going ahead, and I won't ask again for this action.",
      deny: "Understood — I won't do it.",
    },
    askOpenApp: "This one needs your own input. Open Sentra on the web to continue.",
    pairing: {
      paired: "WhatsApp paired. Your agent is listening — just send a message.",
      invalid: "That pairing code is invalid or expired. Generate a new one in Settings.",
      "conflict-number": "This WhatsApp number is already paired.",
      "conflict-bot": "That agent already has a paired number. Unpair it first in Settings.",
    },
    channelJoined: "You're in — your agent will now see and reply to that group.",
    channelDeclined: "No problem, your agent will stay out of that group.",
    channelLeft:
      "You've left the channel; your agent will no longer post there. The iMessage group itself is unchanged. This deployment cannot remove the line from the group, so leaving only stops your agent's participation.",
    connectionApproved: "Connection approved — your agents can now message each other.",
    connectionDeclined: "Connection declined.",
    connectionAccepted:
      "Your connection request was accepted — your agents can now message each other.",
    channelInvite:
      '"{name}" was linked to your Sentra Bot line. Reply YES to let your agent join the conversation there, or NO to stay out.',
    channelInviteNote:
      'You were added to iMessage group "{name}". Reply YES in this conversation to join it with your agent.',
    channelIntro:
      "Hi — this number hosts Sentra Bot personal agents. Some people in this group haven't texted this line yet; send any message to this number first if you want your own agent here.",
  },
};

export function phoneStrings(locale: PhoneLocale): PhoneStrings {
  return STRINGS[locale];
}

/** Localized labels for the approval actions the approval ask always ships. */
const ACTION_LABELS: Record<PhoneLocale, Record<string, string>> = {
  id: { allow: "Izinkan sekali", always: "Selalu izinkan", deny: "Jangan" },
  en: { allow: "Allow once", always: "Always allow", deny: "Deny" },
};

export type PhoneAskCard = {
  /** Text to send over the phone channel. */
  body: string;
  /** Reply digit → action id, in the order the card lists them. */
  answers: Record<string, string>;
};

/**
 * Render an approval ask as something answerable by text: the summary, its
 * detail, then numbered actions. Returns null for asks that cannot be answered
 * safely over a messaging channel — a secret or free-form prompt belongs in the
 * app, never in a chat transcript.
 */
export function renderPhoneAskCard(
  block: Extract<MessageBlock, { kind: "ask" }>,
  locale: PhoneLocale,
): PhoneAskCard | null {
  if (block.input) return null;
  const actions = block.actions ?? [];
  if (actions.length === 0) return null;
  const labels = ACTION_LABELS[locale];
  const strings = phoneStrings(locale);
  const answers: Record<string, string> = {};
  const lines = actions.map((action, index) => {
    const digit = String(index + 1);
    answers[digit] = action.id;
    return `${digit} = ${labels[action.id] ?? action.label}`;
  });
  const body = [block.text, block.detail, `${strings.askReplyPrompt} ${lines.join(", ")}`]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n");
  return { body, answers };
}
