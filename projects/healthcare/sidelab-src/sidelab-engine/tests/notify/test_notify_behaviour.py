# Architected and built by codieverse+.
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from sidelab.notify import message_builder as mb
from sidelab.notify import notification_gateway as ng
from sidelab.notify.config import NotifyConfig
from sidelab.notify.telegram_client import TelegramClient

# Nilai sintetis saja: bukan token bot atau chat id sungguhan.
_TOKEN = "000000:synthetic-token"
_CHAT = "chat-id-uji"
_PASIEN = {
    "nama": "Pasien Uji",
    "umur": 41,
    "jk": "P",
    "bb": 55,
    "tb": 158,
    "alergi": "tidak ada",
}


def _at_hour(hour):
    fake_dt = MagicMock()
    fake_dt.now.return_value = datetime(2026, 1, 15, hour, 30)
    return patch("sidelab.notify.message_builder.datetime", fake_dt)


class GreetingTests(unittest.TestCase):
    def test_greeting_follows_time_of_day_buckets(self):
        cases = {4: "malam", 5: "pagi", 10: "pagi", 11: "siang", 14: "siang",
                 15: "sore", 18: "sore", 19: "malam", 23: "malam"}
        for hour, expected in cases.items():
            with self.subTest(hour=hour), _at_hour(hour):
                self.assertEqual(mb._greeting(), expected)


class FormatMessageTests(unittest.TestCase):
    def test_non_referral_output_uses_normal_format_with_session_header(self):
        with _at_hour(9):
            text = mb.format_message("DIAGNOSIS KERJA: Faringitis akut", _PASIEN, "S-01")
        self.assertTrue(text.startswith("📋 *SIDELAB Output*\n_15 Jan 2026, 09:30_"))
        self.assertIn("Session: `S-01`", text)
        self.assertTrue(text.endswith("DIAGNOSIS KERJA: Faringitis akut"))
        self.assertNotIn("Pasien Uji", text)

    def test_normal_format_truncates_body_to_3800_characters(self):
        text = mb.format_normal("x" * 5000, "S-02")
        _, body = text.split("\n\n", 1)
        self.assertEqual(body, "x" * 3800)

    def test_kriteria_rujuk_output_routes_to_referral_with_patient_identity(self):
        response = "DIAGNOSIS KERJA: Apendisitis akut\nKRITERIA RUJUK: nyeri RLQ menetap"
        with _at_hour(16):
            text = mb.format_message(response, _PASIEN, "S-03")
        self.assertTrue(text.startswith("Selamat sore dokter,"))
        for line in ("Atas nama: Pasien Uji", "Umur: 41 tahun", "Jenis Kelamin: P",
                     "BB: 55 kg", "TB: 158 cm", "Alergi: tidak ada"):
            self.assertIn(line, text)
        self.assertNotIn("Session:", text)

    def test_referral_section_is_found_case_insensitively_and_keeps_original_casing(self):
        response = "Anamnesis singkat.\nKriteria Rujuk: Demam >7 hari, Trombosit turun"
        with _at_hour(12):
            text = mb.format_referral(response, _PASIEN, "S-04")
        self.assertIn("Kriteria Rujuk: Demam >7 hari, Trombosit turun", text)
        self.assertNotIn("Anamnesis singkat.", text)

    def test_referral_section_is_cut_1500_characters_after_the_marker(self):
        marker = "KRITERIA RUJUK"
        response = marker + "A" * 1500 + "#" * 100
        with _at_hour(12):
            text = mb.format_referral(response, _PASIEN, "S-05")
        self.assertIn(marker + "A" * 1500, text)
        self.assertNotIn("#", text)

    def test_missing_patient_fields_render_as_dash(self):
        with _at_hour(12):
            text = mb.format_referral("KRITERIA RUJUK: sesak", {}, "S-06")
        self.assertIn("Atas nama: -", text)
        self.assertIn("Alergi: -", text)

    def test_referral_message_is_capped_at_4000_characters(self):
        long_pasien = dict(_PASIEN, alergi="z" * 5000)
        with _at_hour(12):
            text = mb.format_referral("KRITERIA RUJUK: sesak", long_pasien, "S-07")
        self.assertEqual(len(text), 4000)


class TelegramClientTests(unittest.TestCase):
    def test_client_is_disabled_without_chat_id_and_never_posts(self):
        with patch("sidelab.notify.telegram_client.requests.post") as mock_post:
            client = TelegramClient(_TOKEN, "")
            self.assertFalse(client.enabled)
            self.assertFalse(client.send_message("halo"))
        mock_post.assert_not_called()

    def test_send_posts_markdown_payload_to_bot_endpoint(self):
        with patch("sidelab.notify.telegram_client.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=200)
            client = TelegramClient(_TOKEN, _CHAT, timeout=7)
            self.assertTrue(client.send_message("halo *dok*"))
        mock_post.assert_called_once_with(
            f"https://api.telegram.org/bot{_TOKEN}/sendMessage",
            json={"chat_id": _CHAT, "text": "halo *dok*", "parse_mode": "Markdown"},
            timeout=7,
        )

    def test_non_200_response_reports_failure(self):
        with patch("sidelab.notify.telegram_client.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=400)
            self.assertFalse(TelegramClient(_TOKEN, _CHAT).send_message("halo"))

    def test_exception_on_first_attempt_is_retried_once(self):
        with patch("sidelab.notify.telegram_client.requests.post") as mock_post:
            mock_post.side_effect = [ConnectionError("putus"), MagicMock(status_code=200)]
            with self.assertLogs("sidelab_notify", "WARNING") as logs:
                self.assertTrue(TelegramClient(_TOKEN, _CHAT).send_message("halo"))
        self.assertEqual(mock_post.call_count, 2)
        self.assertEqual(len(logs.records), 1)
        self.assertIn("attempt 1 failed", logs.output[0])

    def test_two_failed_attempts_return_false_and_log_each(self):
        with patch("sidelab.notify.telegram_client.requests.post") as mock_post:
            mock_post.side_effect = ConnectionError("putus")
            with self.assertLogs("sidelab_notify", "WARNING") as logs:
                self.assertFalse(TelegramClient(_TOKEN, _CHAT).send_message("halo"))
        self.assertEqual(mock_post.call_count, 2)
        self.assertEqual(len(logs.records), 2)
        self.assertIn("attempt 2 failed", logs.output[1])


class NotificationGatewayTests(unittest.TestCase):
    def test_publish_forwards_text_to_client(self):
        client = MagicMock()
        ng.NotificationGateway(client).publish("halo")
        client.send_message.assert_called_once_with("halo")

    def test_publish_swallows_client_errors_and_logs_them(self):
        client = MagicMock()
        client.send_message.side_effect = RuntimeError("telegram down")
        with self.assertLogs("sidelab_notify", "ERROR") as logs:
            ng.NotificationGateway(client).publish("halo")
        self.assertIn("telegram down", logs.output[0])

    def test_init_gateway_builds_client_when_config_enabled(self):
        cfg = NotifyConfig(enabled=True, bot_token=_TOKEN, chat_id=_CHAT)
        with patch.object(ng, "load_config", return_value=cfg):
            gateway = ng._init_gateway()
        self.assertIsInstance(gateway.client, TelegramClient)
        self.assertEqual(gateway.client.chat_id, _CHAT)

    def test_init_gateway_has_no_client_when_config_disabled(self):
        cfg = NotifyConfig(enabled=False, bot_token="", chat_id="")
        with patch.object(ng, "load_config", return_value=cfg):
            self.assertIsNone(ng._init_gateway().client)

    def test_init_gateway_falls_back_to_no_client_when_config_fails(self):
        with patch.object(ng, "load_config", side_effect=OSError("env tidak terbaca")):
            self.assertIsNone(ng._init_gateway().client)


if __name__ == "__main__":
    unittest.main()
