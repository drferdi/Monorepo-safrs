# Architected and built by codieverse+.
import unittest

from sidelab import vocab


class ClinicalSummaryProfileTests(unittest.TestCase):
    def test_accepts_precomputed_profile(self):
        """_build_clinical_summary harus menerima profile yang sudah dihitung."""
        query = "batuk darah sesak napas"
        profile = vocab._extract_query_profile(query)
        result = vocab._build_clinical_summary(query, profile)
        self.assertIn("RINGKASAN KLINIS", result)

    def test_profile_param_produces_same_output_as_no_param(self):
        """Output dengan profile param harus identik dengan tanpa param."""
        query = "nyeri dada berdebar"
        profile = vocab._extract_query_profile(query)
        with_profile = vocab._build_clinical_summary(query, profile)
        without_profile = vocab._build_clinical_summary(query)
        self.assertEqual(with_profile, without_profile)

    def test_none_profile_falls_back_to_computing(self):
        """profile=None harus compute sendiri — tidak crash."""
        result = vocab._build_clinical_summary("demam tinggi", None)
        self.assertIsInstance(result, str)
        self.assertIn("RINGKASAN", result)

    def test_different_query_different_profile_different_output(self):
        """Profile dari query berbeda menghasilkan output berbeda."""
        q1 = "hemoptisis batuk darah"
        q2 = "pusing kepala berputar"
        r1 = vocab._build_clinical_summary(q1)
        r2 = vocab._build_clinical_summary(q2)
        self.assertNotEqual(r1, r2)


if __name__ == "__main__":
    unittest.main()
