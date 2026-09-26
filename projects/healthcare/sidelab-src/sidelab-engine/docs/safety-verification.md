# SideLab Safety Verification

Use this profile when you need safety confidence without running the full or performance suite.

```powershell
.\.venv\Scripts\python.exe run_safety_tests.py
```

This covers:

- pharmacology guardrails,
- no-fabrication,
- final output pipeline,
- CLI/TUI safety parity,
- insufficient-data behavior,
- red flag diagnostic framing,
- emergency referral escalation,
- DDI/KI lint.

Do not run performance tests on low-resource machines unless explicitly requested.
