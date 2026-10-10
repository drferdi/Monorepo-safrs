"""Server-side PII re-check, the second line of defence after Med Assist's pii-guard.

Checks NIK and BPJS numbers, phone numbers, email addresses and names written with an Indonesian
title. The number, phone and email patterns are copied from PII_PATTERNS in med-assist
`lib/iskandar-diagnosis-engine/anonymizer.ts` (lines 31-60). The title pattern differs on
purpose: there the whole pattern is case-insensitive, so "Ibu pasien mengatakan" counts as a
name, and its RM-number pattern matches the word "normal". Here the title is case-insensitive
and the name must start with a capital letter. Like the client, this is a pattern detector: a
bare name without a title passes.
"""

from __future__ import annotations

import re

PII_PATTERNS = {
    "NIK": re.compile(r"\b\d{16}\b"),
    "BPJS": re.compile(r"\b\d{13}\b"),
    "PHONE_08": re.compile(r"\b08\d{8,11}\b"),
    "PHONE_62": re.compile(r"\+?62\d{9,12}\b"),
    "PHONE_GENERAL": re.compile(r"\b(?:\+62|62|0)[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "TITLED_NAME": re.compile(r"\b(?i:tn\.|ny\.|nn\.|an\.|sdr\.|sdri\.|bpk\.|bapak|ibu|dr\.)\s*[A-Z][a-z]+"),
}


def pii_kinds(text: str) -> list[str]:
    """Names of the patterns found; never the matched text."""
    return [name for name, pattern in PII_PATTERNS.items() if pattern.search(text)]
