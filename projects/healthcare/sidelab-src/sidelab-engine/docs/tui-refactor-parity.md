# TUI Refactor Parity

SideLab is TUI-first. Refactors must preserve the physician-facing TUI behavior unless a separate migration task explicitly changes it.

## Golden Behaviors

- Startup creates one session id and displays the configured backend/model state in the sidebar.
- Backend readiness is checked before clinical chat is allowed.
- Doctor input flows through `SidelabApp._chat_fn()` and commits the finalized response into `_last_response`.
- Save uses conversation history that already contains the finalized clinical response.
- Copy uses `_last_response`, including safety warnings appended by the clinical output pipeline.
- `/provider` changes the active backend/model shown in the sidebar before the next consultation.
- `/pasien`, `/next`, `/save`, `/copy`, `/help`, and `/exit` remain available in the TUI command surface.
- Sidebar cards continue to update patient, session, diagnosis certainty, clinical chains, and data gaps.

## Current Parity Checks

Run focused checks with the repository virtual environment:

```powershell
& .\.venv\Scripts\python.exe -m pytest tests\test_tui_runtime_boundary.py tests\clinical\test_tui_safety_parity.py -q
```

For broader safety parity after clinical pipeline extraction:

```powershell
& .\.venv\Scripts\python.exe -m pytest tests\clinical\test_output_pipeline.py tests\clinical\test_no_fabrication.py tests\clinical\test_insufficient_data.py tests\clinical\test_red_flag_engine.py -q
```

## Refactor Rule

`sidelab_tui.py` must stay a thin launcher. It may build a runtime and create `SidelabApp`, but it must not import or load `sidelab.py` directly.
