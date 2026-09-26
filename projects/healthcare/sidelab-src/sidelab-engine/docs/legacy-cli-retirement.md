# Legacy CLI Retirement

The product direction is TUI-first. `sidelab.py` is currently a legacy clinical core dependency, not the desired runtime boundary.

## Current Legacy References

- `sidelab_tui.py` previously loaded `sidelab.py` directly. This is now routed through `sidelab/runtime.py`.
- `run.bat` now launches `sidelab_tui.py`.
- `diagnose-sidelab.bat` now checks for `sidelab_tui.py`.
- `installer/build-installer.ps1` includes `sidelab_tui.py` and still includes `sidelab.py` because the current runtime adapter still depends on the legacy clinical core.
- README still describes `sidelab.py` as the main legacy entry point.
- Many tests still import `sidelab.py` directly through `importlib.util.spec_from_file_location()` or `load_sidelab_core()`.
- Vocab normalization, clinical-summary profile, disease scoring, ICD index lookup, drug-stock normalization, pharmacology detail lookup, absolute-language detection, TUI runtime boot, and session persistence now have package-level test targets.

## Retirement Passes

1. Move the clinical chat path used by TUI from `sidelab.py` to `sidelab/chat_pipeline.py`.
2. Keep session persistence in `sidelab/session_store.py` and route TUI saves through `sidelab/runtime.py`.
3. Repoint domain tests from `sidelab.py` to package modules.
4. Keep `run.bat`, diagnostics, installer scripts, and installer tests pointed at `sidelab_tui.py`.
5. Replace `sidelab.py` with a compatibility stub or remove it in a separate migration task.

## Completed Cleanup

- `sidelab_tui.py` no longer imports `importlib.util`, `sidelab.py`, or `sidelab_core`.
- `run.bat` targets `sidelab_tui.py`.
- `diagnose-sidelab.bat` validates `sidelab_tui.py`.
- TUI save persistence is in `sidelab/session_store.py`.
- Disease scoring is testable through `sidelab/disease_scoring.py`.
- ICD index and pharmacology detail lookup are testable through `sidelab/icd/indexes.py`.
- Drug-stock normalization is testable through `sidelab/drug_stock.py`.

## Validation Gate

Before quarantining `sidelab.py`, this search should only show intentional legacy documentation or compatibility stubs:

```powershell
rg -n "sidelab\.py|load_sidelab_core|sidelab_core" .
```
