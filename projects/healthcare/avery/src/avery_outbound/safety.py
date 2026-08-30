"""Envelope keselamatan deterministik untuk keluaran WhatsApp.

Dipanggil sebelum pesan dikirim. Hasilnya alasan drop, atau None bila
boleh dikirim. Tidak pernah menulis pengganti ke chat: yang ditolak
menjadi diam (setara NO_REPLY).

Sumber kebenaran untuk gerbang ini. Salinan fail-closed di mixin WhatsApp
Hermes harus tetap selaras dengan fungsi `drop_reason` di berkas ini.
"""

from __future__ import annotations

import re

REASON_EMPTY = "EMPTY"
REASON_SEPARATOR = "SEPARATOR_ONLY"
REASON_THINKING_ONLY = "THINKING_ONLY"
REASON_EMPTY_MODEL = "EMPTY_MODEL"
REASON_RETRYING = "RETRYING"
REASON_FALLBACK_PROVIDER = "FALLBACK_PROVIDER"
REASON_TOOL = "TOOL"
REASON_JOB_ID = "JOB_ID"
REASON_TRACEBACK = "TRACEBACK"
REASON_INTERNAL = "INTERNAL_INSTRUCTION"

_SEPARATOR_CHARS = set(" \t\r\n-_–—=*•·─━═~.|/\\")

_PHRASE_CHECKS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"thinking-only\s+response", re.I), REASON_THINKING_ONLY),
    (re.compile(r"empty\s+response\s+from\s+model", re.I), REASON_EMPTY_MODEL),
    (re.compile(r"the model returned no response", re.I), REASON_EMPTY_MODEL),
    (re.compile(r"\(\s*empty\s*\)", re.I), REASON_EMPTY_MODEL),
    (re.compile(r"fallback\s+provider", re.I), REASON_FALLBACK_PROVIDER),
    (re.compile(r"\bjob_id\b", re.I), REASON_JOB_ID),
    (re.compile(r"cronjob response", re.I), REASON_JOB_ID),
    (re.compile(r"to stop or manage this job", re.I), REASON_JOB_ID),
    (re.compile(r"traceback", re.I), REASON_TRACEBACK),
)

# Status retry Hermes, bukan kata "retry" dalam rencana kerja.
_RETRYING_RE = re.compile(
    r"(?i)(\bretrying\b(\s+(in|with|once|from|after)|\.{2,}|…)"
    r"|;\s*retrying\b"
    r"|retrying\s+\()"
)

# Jejak tool / narasi eksekusi. Bukan kata "tool" dalam laporan status.
_TOOL_TRACE_RE = re.compile(
    r"(?im)^(?:\s*(?:reading skill|searching files|updating memory|"
    r"calling tool|using tool|running tool|tool result|tool_call|"
    r"tool\.started|tool\.completed|tool\.failed)\b).*"
    r"|^\s*\[[^\]]*tool[^\]]*\]"
)

# Frasa status Hermes (agent/display.py). Pesan PENDEK yang diawali ini
# adalah gelembung progress, termasuk bila ada emoji di depan.
_PROGRESS_HEADS = (
    "reading skill",
    "listing skills",
    "searching files",
    "searching the web",
    "searching past sessions",
    "updating memory",
    "updating skill",
    "updating tasks",
    "calling tool",
    "using tool",
    "running tool",
    "running code",
    "generating image",
    "generating video",
    "generating speech",
    "looking at the image",
    "delegating",
    "scheduling",
)

_STATUS_PREFIX_RE = re.compile(r"^[\W_]+", re.UNICODE)

# Hanya dump prompt/sistem. Jangan cocokkan nama kunci config (require_mention,
# skills_list, soul.md) — laporan operasional Avery memuat kata itu dan
# 2026-08-28 01:36 jawaban 1003 karakter sempat di-drop INTERNAL_INSTRUCTION.
_INTERNAL_RE = re.compile(
    r"(?is)("
    r"<\|im_start\|>|<\|im_end\|>|"
    r"\[INST\]|<<SYS>>|"
    r"you are \*?\*?avery[,\s].{0,80}(home agent|persistent)|"
    r"identification workflow|"
    r"do not participate|"
    r"always execute this|"
    r"system prompt|"
    r"### (?:system|instruction)"
    r")"
)


def _is_separator_only(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    return all(ch in _SEPARATOR_CHARS for ch in stripped)


def _is_progress_status(text: str) -> bool:
    """True bila seluruh pesan adalah gelembung status tool Hermes."""
    core = _STATUS_PREFIX_RE.sub("", text.strip()).strip()
    if not core or len(core) > 120:
        return False
    low = core.lower()
    for head in _PROGRESS_HEADS:
        if low == head or low.startswith(head + " ") or low.startswith(head + ":"):
            return True
    return False


def drop_reason(text: str | None) -> str | None:
    """Kembalikan kode alasan bila teks tidak boleh dikirim, else None."""
    if text is None:
        return REASON_EMPTY
    raw = str(text)
    if not raw.strip():
        return REASON_EMPTY
    if _is_separator_only(raw):
        return REASON_SEPARATOR
    for pattern, reason in _PHRASE_CHECKS:
        if pattern.search(raw):
            return reason
    if _RETRYING_RE.search(raw):
        return REASON_RETRYING
    if _is_progress_status(raw):
        return REASON_TOOL
    if _TOOL_TRACE_RE.search(raw):
        return REASON_TOOL
    if _INTERNAL_RE.search(raw):
        return REASON_INTERNAL
    return None
