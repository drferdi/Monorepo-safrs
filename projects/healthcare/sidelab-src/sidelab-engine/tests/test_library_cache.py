# Architected and built by codieverse+.
import unittest

from sidelab.library_cache import LibraryResolverCache


class LibraryCacheTests(unittest.TestCase):
    def setUp(self):
        self.call_count = 0

        def resolver(entry: dict) -> dict:
            self.call_count += 1
            return {"entry": entry}

        self.cache = LibraryResolverCache(resolver)

    def _make_entry(self, normalized: str, source: str = "", icd: str = "") -> dict:
        return {
            "normalized_name": normalized,
            "source_name": source,
            "primary_icd10": icd,
            "source_icd10": "",
            "total_cases": 0,
            "rank": 999,
        }

    def test_second_call_uses_cache(self):
        entry = self._make_entry("hipertensi esensial")

        self.cache.resolve(entry)
        self.cache.resolve(entry)

        self.assertEqual(self.call_count, 1, "Uncached impl harus dipanggil hanya sekali")

    def test_different_entries_not_conflated(self):
        entry_a = self._make_entry("hipertensi esensial")
        entry_b = self._make_entry("diabetes mellitus tipe 2")

        result_a = self.cache.resolve(entry_a)
        result_b = self.cache.resolve(entry_b)

        key_a = "hipertensi esensial||"
        key_b = "diabetes mellitus tipe 2||"
        self.assertIn(key_a, self.cache.cache)
        self.assertIn(key_b, self.cache.cache)
        self.assertIs(self.cache.cache[key_a], result_a)
        self.assertIs(self.cache.cache[key_b], result_b)

    def test_cache_contains_one_entry_after_single_call(self):
        entry = self._make_entry("gastritis")
        self.cache.resolve(entry)
        self.assertEqual(
            len(self.cache.cache),
            1,
            "Hanya satu entry yang harus ada di cache setelah satu panggilan",
        )

    def test_empty_entry_does_not_crash(self):
        try:
            self.cache.resolve({})
        except Exception as exc:
            self.fail(f"Empty entry crash: {exc}")


if __name__ == "__main__":
    unittest.main()
