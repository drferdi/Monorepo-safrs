# Architected and built by codieverse+.
import unittest

from sidelab.notify.message_builder import format_referral


class MessageBuilderTests(unittest.TestCase):
    def test_format_referral_without_kriteria_rujuk_does_not_slice_last_character(self):
        response_text = "DIAGNOSIS KERJA:\nA"
        formatted = format_referral(response_text, {}, "ABC123")
        self.assertNotIn("\nA\n\nMohon", formatted)
        self.assertIn("Mohon arahan dan tindak lanjut lebih lanjut dokter.", formatted)


if __name__ == "__main__":
    unittest.main()
