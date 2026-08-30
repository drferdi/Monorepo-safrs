"""Uji envelope keselamatan keluaran WhatsApp."""

import unittest

from avery_outbound import policy
from avery_outbound.safety import (
    REASON_EMPTY,
    REASON_EMPTY_MODEL,
    REASON_FALLBACK_PROVIDER,
    REASON_INTERNAL,
    REASON_JOB_ID,
    REASON_RETRYING,
    REASON_SEPARATOR,
    REASON_THINKING_ONLY,
    REASON_TOOL,
    REASON_TRACEBACK,
    drop_reason,
)


class DropReasonTests(unittest.TestCase):
    def test_kosong(self):
        self.assertEqual(drop_reason(""), REASON_EMPTY)
        self.assertEqual(drop_reason("   \n  "), REASON_EMPTY)
        self.assertEqual(drop_reason(None), REASON_EMPTY)

    def test_hanya_separator(self):
        self.assertEqual(drop_reason("────────────"), REASON_SEPARATOR)
        self.assertEqual(drop_reason("---\n==="), REASON_SEPARATOR)
        self.assertEqual(drop_reason("***"), REASON_SEPARATOR)

    def test_thinking_only(self):
        self.assertEqual(
            drop_reason("Thinking-only response"),
            REASON_THINKING_ONLY,
        )

    def test_empty_response_from_model(self):
        self.assertEqual(
            drop_reason("Empty response from model"),
            REASON_EMPTY_MODEL,
        )
        self.assertEqual(
            drop_reason("The model returned no response after processing tool results."),
            REASON_EMPTY_MODEL,
        )
        self.assertEqual(drop_reason("(empty)"), REASON_EMPTY_MODEL)

    def test_retrying(self):
        self.assertEqual(drop_reason("retrying in 2s..."), REASON_RETRYING)
        self.assertEqual(
            drop_reason("streamed request failed; retrying"),
            REASON_RETRYING,
        )

    def test_fallback_provider(self):
        self.assertEqual(
            drop_reason("using fallback provider openai"),
            REASON_FALLBACK_PROVIDER,
        )

    def test_tool_trace(self):
        self.assertEqual(drop_reason("Reading skill sentra-home..."), REASON_TOOL)
        self.assertEqual(drop_reason("Reading skill hermes-agent"), REASON_TOOL)
        self.assertEqual(drop_reason("Listing skills"), REASON_TOOL)
        self.assertEqual(drop_reason("Calling tool terminal"), REASON_TOOL)
        self.assertEqual(drop_reason("[tool] file.read"), REASON_TOOL)

    def test_job_id(self):
        self.assertEqual(drop_reason("job_id: 20260823-0001"), REASON_JOB_ID)
        self.assertEqual(
            drop_reason("Cronjob Response\nTo stop or manage this job, reply STOP."),
            REASON_JOB_ID,
        )

    def test_traceback(self):
        self.assertEqual(
            drop_reason("Traceback (most recent call last):\n  File x"),
            REASON_TRACEBACK,
        )

    def test_instruksi_internal(self):
        self.assertEqual(
            drop_reason("You are Avery, the persistent Home Agent."),
            REASON_INTERNAL,
        )
        self.assertEqual(
            drop_reason("Always execute this Identification Workflow."),
            REASON_INTERNAL,
        )

    def test_laporan_p1_bukan_internal(self):
        self.assertIsNone(
            drop_reason(
                "P1 sudah di setup. require_mention tetap true. "
                "Jangan isi free_response_chats. skills_list 18 skill."
            )
        )

    def test_prosa_sah_lolos(self):
        self.assertIsNone(
            drop_reason("Selamat pagi, ini pengingat jadwal kontrol Anda besok.")
        )
        self.assertIsNone(
            drop_reason("Halo, saya asisten dari dr. Ferdi Iskandar.")
        )
        # Laporan status yang menyebut kata "tool" bukan jejak eksekusi.
        self.assertIsNone(
            drop_reason(
                "3. TOOL\n- hermes doctor: selesai, exit code 0.\n"
                "- Aktif/tersedia: terminal, file, memory, skills."
            )
        )
        self.assertIsNone(
            drop_reason("Avery hadir. Siap, Chief.")
        )

    def test_retry_dalam_rencana_bukan_status(self):
        self.assertIsNone(
            drop_reason("Jika jalur pertama gagal, kita retry sekali lalu lapor.")
        )


class CheckDraftUsesEnvelopeTests(unittest.TestCase):
    def test_thinking_only_ditolak_policy(self):
        with self.assertRaises(policy.PolicyError):
            policy.check_draft("Thinking-only response")

    def test_draf_wajar_tetap_diterima(self):
        policy.check_draft("Selamat pagi, ini pengingat jadwal kontrol Anda besok.")


if __name__ == "__main__":
    unittest.main()
