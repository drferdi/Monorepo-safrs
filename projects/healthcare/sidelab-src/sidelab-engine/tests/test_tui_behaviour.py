# Architected and built by codieverse+.
"""Characterization tests for the Textual TUI (sidelab/tui.py).

Pure card rendering and clipboard helpers are tested directly; command dispatch,
the consultation worker and the provider modal run inside Textual's headless pilot.
All chat/save/readiness collaborators are fakes; no LLM or network is reached.
"""

from __future__ import annotations

import asyncio
import os
import unittest
from unittest.mock import MagicMock, patch

from textual.widgets import Input, Label, ListItem, ListView, LoadingIndicator, RichLog

from sidelab import __version__
from sidelab.console_bridge import RichLogConsole
from sidelab.llm.config import PROVIDER_REGISTRY
from sidelab.tui import (
    CertaintyCard,
    ChainCard,
    DataGapsCard,
    PatientCard,
    ProviderScreen,
    SessionCard,
    SideCard,
    SidelabApp,
)

_SIZE = (160, 50)


def _rendered(card: SideCard, method: str, *args) -> str:
    """Render a card as if mounted and return the plain text passed to update()."""
    card._mounted = True
    with patch.object(card, "update") as update:
        getattr(card, method)(*args)
    return str(update.call_args.args[0])


def _log_text(app: SidelabApp) -> str:
    return "\n".join(line.text for line in app.query_one("#chat-log", RichLog).lines)


def _card_text(app: SidelabApp, card_cls: type) -> str:
    return str(app.query_one(card_cls).content)


def _label_text(screen: ProviderScreen, selector: str) -> str:
    return str(screen.query_one(selector, Label).content)


def _item_texts(list_view: ListView) -> list[str]:
    return [str(item.query_one(Label).content) for item in list_view.query(ListItem)]


class _FakeChat:
    """Records calls and appends to the history it receives, like the runtime chat."""

    def __init__(self, reply: str = "", error: Exception | None = None) -> None:
        self.reply = reply
        self.error = error
        self.calls: list[tuple] = []

    def __call__(self, user_input, history, pasien, model, backend, console):
        self.calls.append((user_input, history, dict(pasien), model, backend, console))
        if self.error is not None:
            raise self.error
        history.append({"role": "user", "content": user_input})
        history.append({"role": "assistant", "content": self.reply})
        return self.reply


def _make_app(**overrides) -> SidelabApp:
    kwargs = {
        "chat_fn": _FakeChat(),
        "save_fn": MagicMock(),
        "backend_label": "DeepSeek",
        "backend_key": "deepseek",
        "model": "deepseek-v4-flash",
        "session_id": "SESS0001",
        "backend_ready": True,
    }
    kwargs.update(overrides)
    return SidelabApp(**kwargs)


async def _submit(pilot, app: SidelabApp, raw: str) -> None:
    inp = app.query_one("#doctor-input", Input)
    inp.focus()
    inp.value = raw
    await pilot.press("enter")
    await pilot.pause()


# ---------------------------------------------------------------------------
# Sidebar cards (pure rendering, no running app)
# ---------------------------------------------------------------------------


class SideCardRenderingTests(unittest.TestCase):
    def test_unmounted_card_does_not_push_updates(self):
        card = PatientCard()
        with patch.object(card, "update") as update:
            card.update_patient({"nama": "Anto"})

        update.assert_not_called()
        self.assertEqual(card._pasien, {"nama": "Anto"})

    def test_patient_card_lists_only_filled_fields_in_fixed_order(self):
        text = _rendered(
            PatientCard(),
            "update_patient",
            {"komorbid": "DM tipe 2", "nama": "Anto", "umur": "40", "jk": ""},
        )

        self.assertIn("Nama: Anto", text)
        self.assertIn("Umur: 40", text)
        self.assertIn("Komorbid: DM tipe 2", text)
        self.assertNotIn("JK:", text)
        self.assertNotIn("Alergi:", text)
        self.assertLess(text.index("Nama:"), text.index("Komorbid:"))

    def test_session_card_reports_connected_when_backend_ready(self):
        text = _rendered(SessionCard(), "update_session", "S1", "DeepSeek", "m", True)

        self.assertIn("● Connected", text)
        self.assertNotIn("Disconnected", text)

    def test_session_card_reports_disconnected_when_backend_not_ready(self):
        text = _rendered(SessionCard(), "update_session", "S1", "DeepSeek", "m", False)

        self.assertIn("● Disconnected", text)

    def test_certainty_card_without_certainty_shows_placeholder(self):
        text = _rendered(CertaintyCard(), "update_certainty", "", "")

        self.assertIn("DIAGNOSIS KERJA", text)
        self.assertIn("Belum ada", text)

    def test_certainty_card_shows_label_icd_and_diagnosis(self):
        text = _rendered(
            CertaintyCard(), "update_certainty", "probable", "Faringitis akut", "J02.9"
        )

        self.assertIn("● PROBABLE", text)
        self.assertIn("[J02.9]", text)
        self.assertIn("Faringitis akut", text)

    def test_certainty_card_truncates_diagnosis_longer_than_38_characters(self):
        diagnosis = "A" * 38 + "BCDEFG"
        text = _rendered(CertaintyCard(), "update_certainty", "possible", diagnosis)

        self.assertIn("○ POSSIBLE", text)
        self.assertIn("A" * 38 + "…", text)
        self.assertNotIn("B", text.split("POSSIBLE", 1)[1])

    def test_certainty_card_omits_icd_line_when_icd_missing(self):
        text = _rendered(
            CertaintyCard(), "update_certainty", "definitive", "Common cold"
        )

        self.assertIn("● DEFINITIVE", text)
        self.assertNotIn("[", text)

    def test_certainty_card_shows_unknown_certainty_verbatim(self):
        text = _rendered(CertaintyCard(), "update_certainty", "custom_level", "Dx")

        self.assertIn("custom_level", text)

    def test_chain_card_without_matches_shows_placeholder(self):
        text = _rendered(ChainCard(), "update_chains", [])

        self.assertIn("Belum ada keluhan", text)

    def test_chain_card_renders_first_two_matches_with_truncated_lists(self):
        matches = [
            {
                "key": "demam",
                "chain": {
                    "clinical_entity": "Febris",
                    "logical_chain": ["a1", "a2", "a3", "a4", "a5"],
                    "pemeriksaan": {"fisik": ["suhu", "nadi", "turgor"]},
                },
            },
            {"key": "batuk", "chain": {}},
            {"key": "sesak", "chain": {"clinical_entity": "Dispnea"}},
        ]
        text = _rendered(ChainCard(), "update_chains", matches)

        self.assertIn("Febris", text)
        self.assertIn("→ a1, a2, a3, a4\n", text)
        self.assertIn("Px: suhu, nadi\n", text)
        self.assertNotIn("turgor", text)
        self.assertIn("batuk", text)
        self.assertNotIn("Dispnea", text)

    def test_data_gaps_card_is_blank_without_gaps(self):
        card = DataGapsCard()
        card._mounted = True
        with patch.object(card, "update") as update:
            card.update_gaps([])

        update.assert_called_once_with(" ")

    def test_data_gaps_card_numbers_first_four_and_truncates_long_questions(self):
        gaps = ["Q" * 50, "Sejak kapan?", "Ada mual?", "Ada muntah?", "Ada diare?"]
        text = _rendered(DataGapsCard(), "update_gaps", gaps)

        self.assertIn("KLARIFIKASI", text)
        self.assertIn("1. " + "Q" * 43 + "…", text)
        self.assertIn("4. Ada muntah?", text)
        self.assertNotIn("Ada diare?", text)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


class BackendKeyTests(unittest.TestCase):
    def test_backend_key_defaults_to_deepseek_when_unset(self):
        self.assertEqual(_make_app(backend_key="")._get_backend_key(), "deepseek")

    def test_backend_key_returns_configured_backend(self):
        self.assertEqual(_make_app(backend_key="local")._get_backend_key(), "local")


class CopyTextTests(unittest.TestCase):
    def test_clip_exe_receives_utf16_text_and_success_returns_true(self):
        proc = MagicMock(returncode=0)
        with patch("subprocess.Popen", return_value=proc) as popen, patch(
            "subprocess.run"
        ) as run:
            ok = SidelabApp._copy_text("Resep: parasetamol 500 mg")

        self.assertTrue(ok)
        self.assertEqual(popen.call_args.args[0], ["clip.exe"])
        proc.communicate.assert_called_once_with(
            input="Resep: parasetamol 500 mg".encode("utf-16-le")
        )
        run.assert_not_called()

    def test_falls_back_to_powershell_when_clip_exe_is_unavailable(self):
        with patch("subprocess.Popen", side_effect=OSError("no clip")), patch(
            "subprocess.run"
        ) as run:
            ok = SidelabApp._copy_text("teks respons")

        self.assertTrue(ok)
        command = run.call_args.args[0]
        self.assertEqual(command[0], "powershell")
        self.assertIn("Set-Clipboard", command)
        self.assertEqual(command[-1], "teks respons")

    def test_returns_false_when_both_clipboard_routes_fail(self):
        with patch("subprocess.Popen", side_effect=OSError("no clip")), patch(
            "subprocess.run", side_effect=OSError("no powershell")
        ):
            self.assertFalse(SidelabApp._copy_text("teks"))


# ---------------------------------------------------------------------------
# Running app: welcome, commands, state
# ---------------------------------------------------------------------------


class SidelabAppMountTests(unittest.IsolatedAsyncioTestCase):
    async def test_welcome_shows_version_and_backend_warning_when_not_ready(self):
        app = _make_app(backend_ready=False)
        async with app.run_test(size=_SIZE) as pilot:
            await pilot.pause()
            text = _log_text(app)
            session = _card_text(app, SessionCard)

        self.assertIn(f"SIDELAB v{__version__}", text)
        self.assertIn("⚠ BACKEND TIDAK SIAP", text)
        self.assertIn("Ketik keluhan atau /help", text)
        self.assertIn("● Disconnected", session)

    async def test_welcome_has_no_backend_warning_when_ready(self):
        app = _make_app(backend_ready=True)
        async with app.run_test(size=_SIZE) as pilot:
            await pilot.pause()
            text = _log_text(app)
            focused = app.focused

        self.assertNotIn("BACKEND TIDAK SIAP", text)
        self.assertEqual(focused.id, "doctor-input")

    async def test_set_loading_toggles_indicator_and_input(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            ind = app.query_one("#loading-ind", LoadingIndicator)
            inp = app.query_one("#doctor-input", Input)

            app._set_loading(True)
            await pilot.pause()
            loading = (ind.has_class("visible"), inp.disabled)

            app._set_loading(False)
            await pilot.pause()
            idle = (ind.has_class("visible"), inp.disabled)

        self.assertEqual(loading, (True, True))
        self.assertEqual(idle, (False, False))


class SidelabAppCommandTests(unittest.IsolatedAsyncioTestCase):
    async def test_submitted_input_is_echoed_and_cleared(self):
        app = _make_app(backend_ready=False)
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "  nyeri kepala  ")
            text = _log_text(app)
            value = app.query_one("#doctor-input", Input).value

        self.assertIn("INPUT DOKTER  ›  nyeri kepala", text)
        self.assertEqual(value, "")

    async def test_blank_input_is_ignored(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "   ")
            text = _log_text(app)

        self.assertNotIn("INPUT DOKTER", text)

    async def test_help_command_is_case_insensitive_and_lists_commands(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "/HELP")
            text = _log_text(app)

        self.assertIn("PERINTAH", text)
        self.assertIn("/pasien nama=X umur=Y jk=L", text)
        self.assertIn("PINTASAN KEYBOARD", text)
        self.assertIn("Ctrl+Y", text)

    async def test_unknown_slash_command_is_reported(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "/foo")
            text = _log_text(app)

        self.assertIn("Perintah tidak dikenal: /foo", text)

    async def test_complaint_with_backend_not_ready_is_not_sent_to_chat(self):
        chat = _FakeChat(reply="tidak boleh dipanggil")
        app = _make_app(chat_fn=chat, backend_ready=False)
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "demam tiga hari")
            await app.workers.wait_for_complete()
            text = _log_text(app)

        self.assertIn("⚠ Backend tidak siap", text)
        self.assertEqual(chat.calls, [])

    async def test_exit_and_quit_commands_exit_the_app(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            for command in ("/exit", "/quit"):
                with self.subTest(command=command):
                    with patch.object(app, "exit") as exit_:
                        await _submit(pilot, app, command)
                    exit_.assert_called_once_with()

    async def test_pasien_without_pairs_shows_format_hint(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "/pasien")
            text = _log_text(app)
            pasien = dict(app._pasien)

        self.assertIn("Format: /pasien nama=Budi umur=45", text)
        self.assertEqual(pasien, {})

    async def test_pasien_pairs_update_state_with_lowercase_keys_and_card(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "/pasien nama=Anto UMUR=40 alergi=penisilin")
            text = _log_text(app)
            pasien = dict(app._pasien)
            card = _card_text(app, PatientCard)

        self.assertEqual(pasien, {"nama": "Anto", "umur": "40", "alergi": "penisilin"})
        self.assertIn("Data pasien diperbarui: nama=Anto, UMUR=40", text)
        self.assertIn("Nama: Anto", card)
        self.assertIn("Umur: 40", card)
        self.assertIn("Alergi: penisilin", card)

    async def test_open_pasien_action_prints_usage_hint(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            app.action_open_pasien()
            await pilot.pause()
            text = _log_text(app)

        self.assertIn("Ketik: /pasien nama=X umur=Y jk=L", text)

    async def test_show_help_action_prints_help(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            app.action_show_help()
            await pilot.pause()
            text = _log_text(app)

        self.assertIn("PINTASAN KEYBOARD", text)


class SidelabAppNewCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_next_command_resets_state_and_sidebar(self):
        app = _make_app(session_id="OLDSESS1")
        async with app.run_test(size=_SIZE) as pilot:
            app._history.append({"role": "user", "content": "demam"})
            app._pasien = {"nama": "Anto"}
            app._last_response = "respons lama"
            app.query_one(PatientCard).update_patient({"nama": "Anto"})
            app.query_one(CertaintyCard).update_certainty("probable", "ISPA")
            app.query_one(DataGapsCard).update_gaps(["Sejak kapan demam?"])

            await _submit(pilot, app, "/next")
            state = (list(app._history), dict(app._pasien), app._last_response)
            session_id = app._session_id
            text = _log_text(app)
            certainty = _card_text(app, CertaintyCard)
            gaps = _card_text(app, DataGapsCard)
            patient = _card_text(app, PatientCard)

        self.assertEqual(state, ([], {}, ""))
        self.assertNotEqual(session_id, "OLDSESS1")
        self.assertRegex(session_id, r"^[0-9A-F]{8}$")
        self.assertIn("Kasus baru dimulai.", text)
        self.assertIn("Belum ada", certainty)
        self.assertEqual(gaps, " ")
        self.assertNotIn("Anto", patient)

    async def test_new_case_action_keeps_history_list_identity(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            history = app._history
            history.append({"role": "user", "content": "batuk"})
            app.action_new_case()
            await pilot.pause()
            same_list = app._history is history

        self.assertTrue(same_list)
        self.assertEqual(history, [])


class SidelabAppSaveTests(unittest.IsolatedAsyncioTestCase):
    async def test_save_without_history_does_not_call_save_fn(self):
        save = MagicMock()
        app = _make_app(save_fn=save)
        async with app.run_test(size=_SIZE) as pilot:
            await _submit(pilot, app, "/save")
            text = _log_text(app)

        self.assertIn("Tidak ada sesi untuk disimpan.", text)
        save.assert_not_called()

    async def test_save_passes_history_patient_and_session_id(self):
        save = MagicMock()
        app = _make_app(save_fn=save, session_id="SAVE0001")
        async with app.run_test(size=_SIZE) as pilot:
            app._history.append({"role": "user", "content": "demam"})
            app._pasien = {"nama": "Anto"}
            app.action_save_session()
            await pilot.pause()
            text = _log_text(app)

        save.assert_called_once_with(
            [{"role": "user", "content": "demam"}], {"nama": "Anto"}, "SAVE0001"
        )
        self.assertIn("Sesi disimpan: SAVE0001", text)

    async def test_save_failure_is_reported_in_log(self):
        save = MagicMock(side_effect=OSError("disk penuh"))
        app = _make_app(save_fn=save)
        async with app.run_test(size=_SIZE) as pilot:
            app._history.append({"role": "user", "content": "demam"})
            await _submit(pilot, app, "/save")
            text = _log_text(app)

        self.assertIn("Gagal menyimpan: disk penuh", text)


class SidelabAppCopyTests(unittest.IsolatedAsyncioTestCase):
    async def test_copy_without_response_warns_and_skips_clipboard(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            with patch.object(SidelabApp, "_copy_text") as copy_text:
                await _submit(pilot, app, "/copy")
            text = _log_text(app)

        self.assertIn("Belum ada respons yang bisa disalin.", text)
        copy_text.assert_not_called()

    async def test_salin_copies_last_response_and_confirms(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            app._last_response = "TATALAKSANA:\nIstirahat."
            with patch.object(SidelabApp, "_copy_text", return_value=True) as copy_text:
                await _submit(pilot, app, "/salin")
            text = _log_text(app)

        copy_text.assert_called_once_with("TATALAKSANA:\nIstirahat.")
        self.assertIn("Respons disalin ke clipboard", text)

    async def test_copy_action_reports_clipboard_failure(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            app._last_response = "respons"
            with patch.object(SidelabApp, "_copy_text", return_value=False):
                app.action_copy_response()
                await pilot.pause()
            text = _log_text(app)

        self.assertIn("Gagal menyalin ke clipboard.", text)


# ---------------------------------------------------------------------------
# Consultation worker and sidebar parsing
# ---------------------------------------------------------------------------

_CHAIN_MATCH = [
    {
        "key": "demam",
        "chain": {
            "clinical_entity": "Febris sintetis",
            "logical_chain": ["infeksi"],
            "pemeriksaan": {"fisik": ["suhu"]},
        },
    }
]


class SidelabAppConsultationTests(unittest.IsolatedAsyncioTestCase):
    async def test_consultation_calls_chat_with_session_state_and_updates_sidebar(self):
        reply = (
            "DIAGNOSIS KERJA:\n[A01.0] Demam tifoid — klinis\n\n"
            "TATALAKSANA:\nApakah pasien sudah minum obat sebelumnya?\n"
        )
        chat = _FakeChat(reply=reply)
        app = _make_app(chat_fn=chat, backend_key="", model="m-test")
        with patch("sidelab.intelligence._match_chains", return_value=_CHAIN_MATCH):
            async with app.run_test(size=_SIZE) as pilot:
                app._pasien = {"nama": "Anto"}
                await _submit(pilot, app, "demam 5 hari")
                await app.workers.wait_for_complete()
                await pilot.pause()
                text = _log_text(app)
                last = app._last_response
                certainty = _card_text(app, CertaintyCard)
                chains = _card_text(app, ChainCard)
                gaps = _card_text(app, DataGapsCard)
                inp = app.query_one("#doctor-input", Input)
                loading_visible = app.query_one("#loading-ind").has_class("visible")
                input_disabled = inp.disabled

        self.assertEqual(len(chat.calls), 1)
        user_input, history, pasien, model, backend, console = chat.calls[0]
        self.assertEqual(user_input, "demam 5 hari")
        self.assertIs(history, app._history)
        self.assertEqual(pasien, {"nama": "Anto"})
        self.assertEqual(model, "m-test")
        self.assertEqual(backend, "deepseek")
        self.assertIsInstance(console, RichLogConsole)
        self.assertEqual(last, reply)
        self.assertIn("Menganalisis keluhan...", text)
        self.assertIn("Clinical chains aktif: Febris sintetis", text)
        self.assertIn("Menyusun output terstruktur...", text)
        self.assertIn("Febris sintetis", chains)
        self.assertIn("[A01.0]", certainty)
        self.assertIn("Demam tifoid", certainty)
        self.assertIn("Apakah pasien sudah minum obat sebelumnya?", gaps)
        self.assertFalse(loading_visible)
        self.assertFalse(input_disabled)

    async def test_consultation_error_is_logged_and_input_re_enabled(self):
        chat = _FakeChat(error=RuntimeError("provider timeout"))
        app = _make_app(chat_fn=chat)
        with patch("sidelab.intelligence._match_chains", return_value=[]):
            async with app.run_test(size=_SIZE) as pilot:
                await _submit(pilot, app, "batuk")
                await app.workers.wait_for_complete()
                await pilot.pause()
                text = _log_text(app)
                last = app._last_response
                disabled = app.query_one("#doctor-input", Input).disabled
                chains = _card_text(app, ChainCard)

        self.assertIn("[!] Error: provider timeout", text)
        self.assertNotIn("Clinical chains aktif", text)
        self.assertEqual(last, "")
        self.assertFalse(disabled)
        self.assertIn("Belum ada keluhan", chains)

    async def test_empty_reply_leaves_sidebar_untouched(self):
        chat = _FakeChat(reply="")
        app = _make_app(chat_fn=chat)
        with patch("sidelab.intelligence._match_chains", return_value=[]):
            async with app.run_test(size=_SIZE) as pilot:
                await _submit(pilot, app, "pusing")
                await app.workers.wait_for_complete()
                await pilot.pause()
                certainty = _card_text(app, CertaintyCard)
                last = app._last_response

        self.assertEqual(last, "")
        self.assertIn("Belum ada", certainty)


class SidebarFromTextTests(unittest.IsolatedAsyncioTestCase):
    async def _parse(self, text: str) -> tuple[str, str]:
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            await asyncio.to_thread(app._update_sidebar_from_text, text)
            await pilot.pause()
            return _card_text(app, CertaintyCard), _card_text(app, DataGapsCard)

    async def test_icd_code_is_extracted_and_name_trimmed_at_em_dash(self):
        certainty, _ = await self._parse(
            "DIAGNOSIS KERJA:\n[M54.3] Iskialgia — nyeri menjalar ke tungkai\n\n"
            "TATALAKSANA:\nIstirahat.\n"
        )

        self.assertIn("● PROBABLE", certainty)
        self.assertIn("[M54.3]", certainty)
        self.assertIn("Iskialgia", certainty)
        self.assertNotIn("menjalar", certainty)

    async def test_name_is_trimmed_at_en_dash_without_icd(self):
        certainty, _ = await self._parse(
            "DIAGNOSIS KERJA:\nFaringitis akut – viral\n"
        )

        self.assertIn("Faringitis akut", certainty)
        self.assertNotIn("viral", certainty)
        self.assertNotIn("[", certainty)

    async def test_certainty_keywords_select_the_certainty_label(self):
        cases = {
            "Common cold — definitif": "● DEFINITIVE",
            "Demam tifoid — mungkin": "○ POSSIBLE",
            "Faringitis akut — data kurang": "○ DATA KURANG",
            "Gastritis akut — klinis": "● PROBABLE",
        }
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            for line, label in cases.items():
                with self.subTest(line=line):
                    await asyncio.to_thread(
                        app._update_sidebar_from_text, f"DIAGNOSIS KERJA:\n{line}\n"
                    )
                    await pilot.pause()
                    self.assertIn(label, _card_text(app, CertaintyCard))

    async def test_text_without_diagnosis_section_keeps_placeholder(self):
        certainty, gaps = await self._parse("TATALAKSANA:\nIstirahat cukup.\n")

        self.assertIn("Belum ada", certainty)
        self.assertEqual(gaps, " ")

    async def test_first_four_questions_become_clarification_gaps(self):
        certainty, gaps = await self._parse(
            "KLARIFIKASI:\n"
            "1. Sejak kapan keluhan demam dimulai?\n"
            "2. Apakah ada batuk berdahak?\n"
            "3. Apakah ada riwayat perjalanan?\n"
            "4. Apakah ada ruam kulit?\n"
            "5. Apakah ada nyeri sendi?\n"
            "Nyeri?\n"
        )

        self.assertIn("Belum ada", certainty)
        self.assertIn("1. Sejak kapan keluhan demam dimulai?", gaps)
        self.assertIn("4. Apakah ada ruam kulit?", gaps)
        self.assertNotIn("nyeri sendi", gaps)
        self.assertNotIn("Nyeri?", gaps)


# ---------------------------------------------------------------------------
# Provider / model modal
# ---------------------------------------------------------------------------


class ProviderScreenTests(unittest.IsolatedAsyncioTestCase):
    async def _open(self, pilot, app: SidelabApp) -> ProviderScreen:
        app.action_change_backend()
        await pilot.pause()
        screen = app.screen
        self.assertIsInstance(screen, ProviderScreen)
        return screen

    async def _choose(self, pilot, list_view: ListView, index: int) -> None:
        list_view.focus()
        list_view.index = index
        await pilot.pause()
        await pilot.press("enter")
        await pilot.pause()

    async def _choose_provider(self, pilot, screen: ProviderScreen, key: str) -> None:
        provider_lv = screen.query_one("#provider-lv", ListView)
        await self._choose(pilot, provider_lv, list(PROVIDER_REGISTRY).index(key))

    async def test_provider_list_marks_current_backend_and_shows_env_model(self):
        app = _make_app(backend_key="deepseek")
        with patch.dict(os.environ, {"DEEPSEEK_MODEL": "deepseek-v4-pro"}):
            async with app.run_test(size=_SIZE) as pilot:
                screen = await self._open(pilot, app)
                items = _item_texts(screen.query_one("#provider-lv", ListView))
                title = _label_text(screen, "#prov-title")
                model_hidden = not screen.query_one("#model-lv").display
                custom_hidden = not screen.query_one("#model-custom").display

        keys = list(PROVIDER_REGISTRY)
        self.assertEqual(len(items), len(keys))
        deepseek_row = items[keys.index("deepseek")]
        self.assertTrue(deepseek_row.startswith("▶  DeepSeek"))
        self.assertTrue(deepseek_row.endswith("deepseek-v4-pro"))
        self.assertTrue(items[keys.index("openai")].startswith("   OpenAI"))
        self.assertEqual(title, "PILIH PROVIDER")
        self.assertTrue(model_hidden)
        self.assertTrue(custom_hidden)

    async def test_choosing_provider_lists_its_models_plus_custom_entry(self):
        app = _make_app(backend_key="deepseek", model="deepseek-v4-pro")
        async with app.run_test(size=_SIZE) as pilot:
            screen = await self._open(pilot, app)
            await self._choose_provider(pilot, screen, "deepseek")
            items = _item_texts(screen.query_one("#model-lv", ListView))
            title = _label_text(screen, "#prov-title")
            phase = screen._phase
            provider_hidden = not screen.query_one("#provider-lv").display

        self.assertEqual(phase, "model")
        self.assertTrue(provider_hidden)
        self.assertEqual(title, "PILIH MODEL  ·  DeepSeek")
        self.assertEqual(
            items,
            [
                "   deepseek-v4-flash",
                "▶  deepseek-v4-pro",
                "   ✏  Ketik model lain...",
            ],
        )

    async def test_selecting_model_applies_backend_and_reports_readiness(self):
        app = _make_app(backend_key="deepseek", model="deepseek-v4-flash")
        with patch(
            "sidelab.llm.check_backend_readiness", return_value=(False, "", "")
        ) as readiness:
            async with app.run_test(size=_SIZE) as pilot:
                screen = await self._open(pilot, app)
                await self._choose_provider(pilot, screen, "openai")
                await self._choose(pilot, screen.query_one("#model-lv", ListView), 1)
                state = (app._backend_key, app._model, app._backend_label)
                ready = app._backend_ready
                text = _log_text(app)
                session = _card_text(app, SessionCard)
                still_modal = isinstance(app.screen, ProviderScreen)

        readiness.assert_called_once_with("openai")
        self.assertFalse(still_modal)
        self.assertEqual(state, ("openai", "gpt-4o", "OpenAI"))
        self.assertFalse(ready)
        self.assertIn("✓ Backend diganti: OpenAI / gpt-4o", text)
        self.assertIn("● Disconnected", session)

    async def test_custom_model_entry_is_trimmed_and_applied(self):
        app = _make_app(backend_key="deepseek")
        with patch("sidelab.llm.check_backend_readiness", return_value=(True, "", "")):
            async with app.run_test(size=_SIZE) as pilot:
                screen = await self._open(pilot, app)
                await self._choose_provider(pilot, screen, "local")
                model_items = _item_texts(screen.query_one("#model-lv", ListView))
                await self._choose(pilot, screen.query_one("#model-lv", ListView), 0)
                phase = screen._phase
                title = _label_text(screen, "#prov-title")
                inp = screen.query_one("#model-custom", Input)
                inp.value = "  medgemma:27b  "
                await pilot.press("enter")
                await pilot.pause()
                state = (app._backend_key, app._model, app._backend_label)
                ready = app._backend_ready

        self.assertEqual(model_items, ["   ✏  Ketik model lain..."])
        self.assertEqual(phase, "custom")
        self.assertEqual(title, "MODEL CUSTOM  ·  Local Ollama")
        self.assertEqual(state, ("local", "medgemma:27b", "Local Ollama"))
        self.assertTrue(ready)

    async def test_blank_custom_model_keeps_modal_open(self):
        app = _make_app(backend_key="deepseek", model="deepseek-v4-flash")
        async with app.run_test(size=_SIZE) as pilot:
            screen = await self._open(pilot, app)
            await self._choose_provider(pilot, screen, "local")
            await self._choose(pilot, screen.query_one("#model-lv", ListView), 0)
            screen.query_one("#model-custom", Input).value = "   "
            await pilot.press("enter")
            await pilot.pause()
            still_modal = app.screen is screen
            model = app._model

        self.assertTrue(still_modal)
        self.assertEqual(model, "deepseek-v4-flash")

    async def test_escape_from_custom_returns_to_model_list(self):
        app = _make_app(backend_key="deepseek")
        async with app.run_test(size=_SIZE) as pilot:
            screen = await self._open(pilot, app)
            await self._choose_provider(pilot, screen, "openai")
            model_lv = screen.query_one("#model-lv", ListView)
            custom_index = len(PROVIDER_REGISTRY["openai"]["models"])
            await self._choose(pilot, model_lv, custom_index)
            inp = screen.query_one("#model-custom", Input)
            inp.value = "draft"
            await pilot.press("escape")
            await pilot.pause()
            phase = screen._phase
            title = _label_text(screen, "#prov-title")
            custom_visible = inp.display
            custom_value = inp.value
            model_visible = model_lv.display

        self.assertEqual(phase, "model")
        self.assertEqual(title, "PILIH MODEL  ·  OpenAI")
        self.assertFalse(custom_visible)
        self.assertEqual(custom_value, "")
        self.assertTrue(model_visible)

    async def test_escape_from_model_list_returns_to_provider_list(self):
        app = _make_app(backend_key="deepseek")
        async with app.run_test(size=_SIZE) as pilot:
            screen = await self._open(pilot, app)
            await self._choose_provider(pilot, screen, "openai")
            await pilot.press("escape")
            await pilot.pause()
            phase = screen._phase
            title = _label_text(screen, "#prov-title")
            provider_visible = screen.query_one("#provider-lv").display
            model_visible = screen.query_one("#model-lv").display

        self.assertEqual(phase, "provider")
        self.assertEqual(title, "PILIH PROVIDER")
        self.assertTrue(provider_visible)
        self.assertFalse(model_visible)

    async def test_escape_from_provider_list_cancels_without_changes(self):
        app = _make_app(backend_key="deepseek", model="deepseek-v4-flash")
        with patch("sidelab.llm.check_backend_readiness") as readiness:
            async with app.run_test(size=_SIZE) as pilot:
                await self._open(pilot, app)
                await pilot.press("escape")
                await pilot.pause()
                still_modal = isinstance(app.screen, ProviderScreen)
                state = (app._backend_key, app._model)
                text = _log_text(app)

        self.assertFalse(still_modal)
        self.assertEqual(state, ("deepseek", "deepseek-v4-flash"))
        self.assertNotIn("Backend diganti", text)
        readiness.assert_not_called()

    async def test_provider_command_aliases_open_the_modal(self):
        app = _make_app()
        async with app.run_test(size=_SIZE) as pilot:
            for command in ("/provider", "/backend", "/model"):
                with self.subTest(command=command):
                    await _submit(pilot, app, command)
                    self.assertIsInstance(app.screen, ProviderScreen)
                    await pilot.press("escape")
                    await pilot.pause()
                    self.assertNotIsInstance(app.screen, ProviderScreen)


if __name__ == "__main__":
    unittest.main()
