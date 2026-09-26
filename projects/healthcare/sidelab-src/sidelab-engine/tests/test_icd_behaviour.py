# Architected and built by codieverse+.
import json
import tempfile
import unittest
from pathlib import Path

import sidelab.icd.database as icd_db
from sidelab.icd import (
    handle_icd_command,
    is_code_query,
    lookup_by_code,
    lookup_or_children,
    metadata,
    search,
)

# Data sintetis — bukan salinan kamus ICD-10 Indonesia yang dikirim bersama capsule.
_FIXTURE = {
    "_metadata": {"source": "synthetic-test-fixture", "version": "t1"},
    "codes": [
        {
            "code": "I10",
            "name_id": "Hipertensi esensial",
            "name_en": "Essential hypertension",
            "chapter": "IX",
            "chapter_name_id": "Penyakit sistem sirkulasi",
            "parent_code": "I10-I15",
        },
        {"code": "E11.0", "name_id": "Diabetes tipe 2 dengan koma", "parent_code": "E11"},
        {"code": "E11.9", "name_id": "Diabetes tipe 2 tanpa komplikasi", "parent_code": "E11"},
        {"code": "Z99", "name_id": "", "name_en": ""},
        # Urutan sengaja terbalik terhadap peringkat: substring, prefix, lalu exact.
        {"code": "K21", "name_id": "Refluks dispepsia kronik"},
        {"code": "K31", "name_id": "Dispepsia fungsional"},
        {"code": "K29", "name_id": "Gastritis", "name_en": "Dyspepsia-like gastritis"},
        {"code": "K30", "name_id": "Dispepsia"},
    ],
}


class _RecordingConsole:
    def __init__(self):
        self.lines: list[str] = []

    def print(self, *args, **_kwargs):
        self.lines.append(" ".join(str(a) for a in args))

    @property
    def text(self) -> str:
        return "\n".join(self.lines)


class _IcdFixtureMixin:
    def _install_fixture(self, payload):
        self._orig_state = (
            icd_db._DATA_FILE,
            icd_db._codes_by_key,
            icd_db._all_entries,
            icd_db._metadata,
        )
        self._tmpdir = tempfile.TemporaryDirectory()
        path = Path(self._tmpdir.name) / "icd_fixture.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        icd_db._DATA_FILE = path
        icd_db._codes_by_key = None
        icd_db._all_entries = None
        icd_db._metadata = None
        return path

    def _restore(self):
        (
            icd_db._DATA_FILE,
            icd_db._codes_by_key,
            icd_db._all_entries,
            icd_db._metadata,
        ) = self._orig_state
        self._tmpdir.cleanup()


class IcdDatabaseBehaviourTests(_IcdFixtureMixin, unittest.TestCase):
    def setUp(self):
        self.path = self._install_fixture(_FIXTURE)

    def tearDown(self):
        self._restore()

    def test_missing_data_file_reports_zero_codes_and_flags_missing_file(self):
        icd_db._DATA_FILE = Path(self._tmpdir.name) / "does_not_exist.json"

        self.assertEqual(metadata(), {"total_codes": 0, "missing_file": True})
        self.assertEqual(icd_db.all_entries(), [])
        self.assertIsNone(icd_db.get_by_code("I10"))
        self.assertEqual(icd_db.get_children("E11"), [])

    def test_metadata_merges_file_metadata_with_valid_code_count(self):
        meta = metadata()

        self.assertEqual(meta["source"], "synthetic-test-fixture")
        self.assertEqual(meta["version"], "t1")
        self.assertEqual(meta["total_codes"], 8)
        self.assertEqual(meta["invalid_entries"], 0)

    def test_get_by_code_ignores_case_and_surrounding_whitespace(self):
        entry = icd_db.get_by_code("  e11.9 ")

        self.assertEqual(entry["name_id"], "Diabetes tipe 2 tanpa komplikasi")

    def test_get_by_code_returns_none_for_empty_code(self):
        self.assertIsNone(icd_db.get_by_code(""))

    def test_get_children_returns_entries_whose_parent_matches_uppercased_prefix(self):
        kids = icd_db.get_children(" e11 ")

        self.assertEqual([k["code"] for k in kids], ["E11.0", "E11.9"])

    def test_get_children_returns_empty_list_for_empty_parent(self):
        self.assertEqual(icd_db.get_children(""), [])

    def test_loaded_dictionary_is_cached_until_state_is_reset(self):
        self.assertIsNotNone(icd_db.get_by_code("I10"))
        self.path.write_text(json.dumps({"codes": []}), encoding="utf-8")

        self.assertIsNotNone(icd_db.get_by_code("I10"))
        self.assertEqual(metadata()["total_codes"], 8)

    def test_entry_with_blank_code_is_counted_invalid_and_not_indexed(self):
        icd_db._codes_by_key = None
        self.path.write_text(
            json.dumps({"codes": [{"code": "  ", "name_id": "kosong"}, {"code": "A09"}]}),
            encoding="utf-8",
        )

        meta = metadata()

        self.assertEqual(meta["total_codes"], 1)
        self.assertEqual(meta["invalid_entries"], 1)
        self.assertIsNotNone(icd_db.get_by_code("A09"))

    def test_non_object_entry_is_counted_invalid_and_not_indexed(self):
        icd_db._codes_by_key = None
        self.path.write_text(json.dumps({"codes": ["A09", {"code": "B01"}]}), encoding="utf-8")

        meta = metadata()

        self.assertEqual(meta["total_codes"], 1)
        self.assertEqual(meta["invalid_entries"], 1)
        self.assertIsNone(icd_db.get_by_code("A09"))
        self.assertIsNotNone(icd_db.get_by_code("B01"))


class IcdSearchBehaviourTests(_IcdFixtureMixin, unittest.TestCase):
    def setUp(self):
        self._install_fixture(_FIXTURE)

    def tearDown(self):
        self._restore()

    def test_is_code_query_accepts_letter_two_digits_and_optional_subcode(self):
        for query in ("I10", "e11.9", " J06 ", "A09.12"):
            with self.subTest(query=query):
                self.assertTrue(is_code_query(query))

    def test_is_code_query_rejects_names_and_malformed_codes(self):
        for query in ("", "hipertensi", "I1", "I10.", "10I", "II10"):
            with self.subTest(query=query):
                self.assertFalse(is_code_query(query))

    def test_lookup_by_code_returns_the_matching_entry(self):
        self.assertEqual(lookup_by_code("i10")["name_en"], "Essential hypertension")

    def test_lookup_or_children_prefers_exact_entry_over_children(self):
        direct, kids = lookup_or_children("I10")

        self.assertEqual(direct["code"], "I10")
        self.assertEqual(kids, [])

    def test_lookup_or_children_falls_back_to_children_for_parent_only_code(self):
        direct, kids = lookup_or_children("E11")

        self.assertIsNone(direct)
        self.assertEqual([k["code"] for k in kids], ["E11.0", "E11.9"])

    def test_lookup_or_children_returns_nothing_for_unknown_code(self):
        self.assertEqual(lookup_or_children("X77"), (None, []))

    def test_search_ranks_exact_then_prefix_then_substring_matches(self):
        results = search("dispepsia")

        self.assertEqual([r["code"] for r in results], ["K30", "K31", "K21"])

    def test_search_matches_english_names_case_insensitively(self):
        results = search("DYSPEPSIA")

        self.assertEqual([r["code"] for r in results], ["K29"])

    def test_search_keeps_file_order_within_the_same_rank(self):
        results = search("diabetes tipe 2")

        self.assertEqual([r["code"] for r in results], ["E11.0", "E11.9"])

    def test_search_truncates_results_to_limit(self):
        results = search("diabetes", limit=1)

        self.assertEqual([r["code"] for r in results], ["E11.0"])

    def test_search_returns_empty_list_for_blank_query(self):
        self.assertEqual(search(""), [])
        self.assertEqual(search("   "), [])

    def test_search_never_returns_entries_without_any_name(self):
        codes = {r["code"] for r in search("e", limit=100)}

        self.assertNotIn("Z99", codes)


class IcdReplBehaviourTests(_IcdFixtureMixin, unittest.TestCase):
    def setUp(self):
        self._install_fixture(_FIXTURE)
        self.console = _RecordingConsole()

    def tearDown(self):
        self._restore()

    def test_bare_command_shows_usage_with_total_code_count(self):
        handle_icd_command("/icd", self.console)

        self.assertIn("Kamus ICD-10 Indonesia[/bold] — 8 kode tersedia", self.console.text)
        self.assertIn("/icd I10", self.console.text)
        self.assertIn("/icd hipertensi", self.console.text)

    def test_empty_input_is_treated_as_bare_command(self):
        handle_icd_command("", self.console)

        self.assertIn("8 kode tersedia", self.console.text)

    def test_exact_code_shows_full_entry_block(self):
        handle_icd_command("/icd i10", self.console)

        text = self.console.text
        self.assertIn("[bold cyan]I10[/bold cyan]  [yellow]Hipertensi esensial[/yellow]", text)
        self.assertIn("EN:[/dim] Essential hypertension", text)
        self.assertIn("Chapter:[/dim] IX — Penyakit sistem sirkulasi", text)
        self.assertIn("Parent:[/dim] I10-I15", text)

    def test_entry_block_omits_optional_lines_when_fields_are_absent(self):
        handle_icd_command("/icd K30", self.console)

        text = self.console.text
        self.assertIn("[yellow]Dispepsia[/yellow]", text)
        self.assertNotIn("EN:", text)
        self.assertNotIn("Chapter:", text)
        self.assertNotIn("Parent:", text)

    def test_parent_code_lists_family_with_sub_code_count(self):
        handle_icd_command("/icd e11", self.console)

        text = self.console.text
        self.assertIn("E11 family[/bold] [dim](2 sub-kode)", text)
        self.assertIn("Diabetes tipe 2 dengan koma", text)
        self.assertIn("Diabetes tipe 2 tanpa komplikasi", text)

    def test_unknown_code_reports_not_found(self):
        handle_icd_command("/icd x77", self.console)

        self.assertIn("Kode X77 tidak ditemukan.", self.console.text)

    def test_name_query_lists_results_with_count(self):
        handle_icd_command("/icd dispepsia", self.console)

        text = self.console.text
        self.assertIn("Hasil pencarian:[/bold] 'dispepsia' [dim](3 hasil)", text)
        self.assertLess(text.index("K30"), text.index("K31"))
        self.assertLess(text.index("K31"), text.index("K21"))

    def test_name_query_without_match_reports_no_results(self):
        handle_icd_command("/icd tidakada", self.console)

        self.assertIn("Tidak ada hasil untuk 'tidakada'.", self.console.text)


if __name__ == "__main__":
    unittest.main()
