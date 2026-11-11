# Architected and built by codieverse+.
"""
sidelab/tui.py — Textual TUI untuk Sidelab (v2, fixed mount order)
"""

from __future__ import annotations

from typing import Callable

from rich.rule import Rule
from rich.text import Text
from textual import on, work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, ScrollableContainer, Vertical
from textual.screen import ModalScreen
from textual.widgets import (
    Footer,
    Header,
    Input,
    Label,
    ListItem,
    ListView,
    LoadingIndicator,
    RichLog,
    Static,
)

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
C_BORDER = "#9EAAB8"
C_NAME = "#C8D4DC"
C_LABEL = "#686870"
C_VALUE = "#F4F4F6"
C_DIM = "#484850"
C_PANEL = "#0C0C10"
C_INFO = "#88A8C0"
C_SUCCESS = "#6A9478"
C_WARN = "#B8A878"
C_ALERT = "#B87878"
C_META = "#A0ACB8"

CERTAINTY_COLOR = {
    "definitive": C_SUCCESS,
    "probable": C_INFO,
    "possible": C_WARN,
    "insufficient_data": C_ALERT,
}
CERTAINTY_LABEL = {
    "definitive": "● DEFINITIVE",
    "probable": "● PROBABLE",
    "possible": "○ POSSIBLE",
    "insufficient_data": "○ DATA KURANG",
}


# ---------------------------------------------------------------------------
# Sidebar cards — semua extend Static, render hanya setelah on_mount
# ---------------------------------------------------------------------------


class SideCard(Static):
    """Base card: render dilakukan via on_mount, bukan __init__."""

    DEFAULT_CSS = """
    SideCard {
        height: auto;
        margin: 0 0 1 0;
        padding: 0 1;
        border: none;
        border-left: tall #1E1E24;
        background: #080810;
    }
    """

    def __init__(self, initial: str = " ") -> None:
        super().__init__(initial)
        self._mounted = False

    def on_mount(self) -> None:
        self._mounted = True
        self._do_render()

    def _do_render(self) -> None:
        """Override di subclass untuk render konten aktual."""
        pass

    def _safe_update(self, renderable) -> None:
        """Update hanya jika sudah mounted."""
        if self._mounted:
            self.update(renderable)


class PatientCard(SideCard):
    def __init__(self) -> None:
        super().__init__()
        self._pasien: dict = {}

    def _do_render(self) -> None:
        p = self._pasien
        t = Text()
        t.append("  PASIEN\n", style=f"bold {C_BORDER}")
        if not p:
            t.append("  During the experiment,\n", style=f"italic {C_DIM}")
            t.append("  the system does not collect\n", style=f"italic {C_DIM}")
            t.append("  any patient data.\n", style=f"italic {C_DIM}")
        else:
            for key, label in [
                ("nama", "Nama"),
                ("umur", "Umur"),
                ("jk", "JK"),
                ("bb", "BB"),
                ("alergi", "Alergi"),
                ("komorbid", "Komorbid"),
            ]:
                val = p.get(key, "")
                if val:
                    t.append(f"  {label}: ", style=C_LABEL)
                    t.append(f"{val}\n", style=C_VALUE)
        self._safe_update(t)

    def update_patient(self, pasien: dict) -> None:
        self._pasien = pasien
        self._do_render()


class SessionCard(SideCard):
    def __init__(self) -> None:
        super().__init__()
        self._session_id = ""
        self._backend = ""
        self._model = ""
        self._ready = True

    def _do_render(self) -> None:
        t = Text()
        t.append("  RAG ORCHESTRATION\n", style=f"bold {C_BORDER}")
        t.append("  Active\n", style=f"bold {C_SUCCESS}")
        t.append("  Model: ", style=C_LABEL)
        t.append("Sentra Voss 1.7\n", style=f"bold {C_NAME}")
        t.append("  Status: ", style=C_LABEL)
        if self._ready:
            t.append("● Connected\n", style=f"bold {C_SUCCESS}")
        else:
            t.append("● Disconnected\n", style=f"bold {C_ALERT}")
        self._safe_update(t)

    def update_session(
        self, session_id: str, backend: str, model: str, ready: bool
    ) -> None:
        self._session_id = session_id
        self._backend = backend
        self._model = model
        self._ready = ready
        self._do_render()


class CertaintyCard(SideCard):
    def __init__(self) -> None:
        super().__init__()
        self._certainty = ""
        self._diagnosis = ""
        self._icd = ""

    def _do_render(self) -> None:
        t = Text()
        t.append("  DIAGNOSIS KERJA\n", style=f"bold {C_BORDER}")
        if not self._certainty:
            t.append("  Belum ada\n", style=f"italic {C_DIM}")
        else:
            color = CERTAINTY_COLOR.get(self._certainty, C_META)
            label = CERTAINTY_LABEL.get(self._certainty, self._certainty)
            t.append(f"  {label}\n", style=f"bold {color}")
            if self._icd:
                t.append(f"  [{self._icd}]\n", style=f"dim {C_META}")
            if self._diagnosis:
                diag = (
                    self._diagnosis[:38] + "…"
                    if len(self._diagnosis) > 38
                    else self._diagnosis
                )
                t.append(f"  {diag}\n", style=C_VALUE)
        self._safe_update(t)

    def update_certainty(self, certainty: str, diagnosis: str, icd: str = "") -> None:
        self._certainty = certainty
        self._diagnosis = diagnosis
        self._icd = icd
        self._do_render()


class ChainCard(SideCard):
    def __init__(self) -> None:
        super().__init__()
        self._matches: list[dict] = []

    def _do_render(self) -> None:
        t = Text()
        t.append("  CLINICAL CHAINS\n", style=f"bold {C_BORDER}")
        if not self._matches:
            t.append("  Belum ada keluhan\n", style=f"italic {C_DIM}")
        else:
            for m in self._matches[:2]:
                chain = m["chain"]
                entity = chain.get("clinical_entity", m["key"])
                t.append(f"  {entity}\n", style=f"bold {C_INFO}")
                lc = chain.get("logical_chain", [])
                if lc:
                    t.append(f"  → {', '.join(lc[:4])}\n", style=f"dim {C_VALUE}")
                pem = chain.get("pemeriksaan", {})
                fisik = pem.get("fisik", [])
                if fisik:
                    t.append(f"  Px: {', '.join(fisik[:2])}\n", style=f"dim {C_META}")
        self._safe_update(t)

    def update_chains(self, matches: list[dict]) -> None:
        self._matches = matches
        self._do_render()


class DataGapsCard(SideCard):
    def __init__(self) -> None:
        super().__init__()
        self._gaps: list[str] = []

    def _do_render(self) -> None:
        if not self._gaps:
            self._safe_update(" ")
            return
        t = Text()
        t.append("  KLARIFIKASI\n", style=f"bold {C_WARN}")
        for i, gap in enumerate(self._gaps[:4], 1):
            short = gap[:43] + "…" if len(gap) > 43 else gap
            t.append(f"  {i}. {short}\n", style=f"dim {C_WARN}")
        self._safe_update(t)

    def update_gaps(self, gaps: list[str]) -> None:
        self._gaps = gaps
        self._do_render()


# ---------------------------------------------------------------------------
# Provider / Model selector (ModalScreen)
# ---------------------------------------------------------------------------


class ProviderScreen(ModalScreen):
    """Modal dua langkah: pilih provider → pilih model → (opsional) ketik custom."""

    BINDINGS = [Binding("escape", "go_back", "Kembali / Batal")]

    DEFAULT_CSS = """
    ProviderScreen {
        align: center middle;
    }
    #prov-dialog {
        background: #080810;
        border: solid #2A2A38;
        width: 66;
        height: auto;
        max-height: 34;
        padding: 1 2;
    }
    #prov-title {
        color: #9EAAB8;
        text-style: bold;
        padding: 0 0 1 0;
    }
    #prov-hint {
        color: #484850;
        padding: 1 0 0 0;
    }
    #provider-lv, #model-lv {
        background: #080810;
        height: auto;
        max-height: 24;
        border: none;
    }
    #provider-lv > ListItem, #model-lv > ListItem {
        padding: 0 0;
        color: #A0ACB8;
    }
    #provider-lv > ListItem.--highlight,
    #model-lv > ListItem.--highlight {
        background: #14141E;
        color: #F4F4F6;
    }
    #model-custom {
        margin-top: 1;
        border: solid #2A2A38;
        background: #080810;
        color: #F4F4F6;
    }
    """

    def __init__(self, current_backend: str, current_model: str) -> None:
        super().__init__()
        self._current_backend = current_backend
        self._current_model = current_model
        self._phase = "provider"
        self._selected_backend = ""
        self._provider_keys: list[str] = []
        self._model_names: list[str] = []

    def compose(self) -> ComposeResult:
        with Vertical(id="prov-dialog"):
            yield Label("PILIH PROVIDER", id="prov-title")
            yield ListView(id="provider-lv")
            yield ListView(id="model-lv")
            yield Input(
                placeholder="  Nama model (contoh: gpt-4o-mini) ...",
                id="model-custom",
            )
            yield Label("↑↓ navigasi   Enter pilih   Esc batal", id="prov-hint")

    def on_mount(self) -> None:
        self.query_one("#model-lv").display = False
        self.query_one("#model-custom").display = False
        self._populate_providers()

    # --- Phase 1: daftar provider ---

    def _populate_providers(self) -> None:
        import os

        from sidelab.llm.config import PROVIDER_REGISTRY

        lv = self.query_one("#provider-lv", ListView)
        lv.clear()
        self._provider_keys = list(PROVIDER_REGISTRY.keys())
        for key, spec in PROVIDER_REGISTRY.items():
            model = os.getenv(spec["model_env"], spec["default_model"])
            marker = "▶  " if key == self._current_backend else "   "
            text = f"{marker}{spec['label']:<22} {model}"
            lv.append(ListItem(Label(text)))
        self.query_one("#prov-title", Label).update("PILIH PROVIDER")
        self.query_one("#prov-hint", Label).update(
            "↑↓ navigasi   Enter pilih   Esc batal"
        )
        lv.focus()

    # --- Phase 2: daftar model ---

    def _populate_models(self, backend_key: str) -> None:
        from sidelab.llm.config import PROVIDER_REGISTRY

        spec = PROVIDER_REGISTRY[backend_key]
        self._selected_backend = backend_key
        self._model_names = list(spec.get("models", ()))

        lv = self.query_one("#model-lv", ListView)
        lv.clear()
        for m in self._model_names:
            marker = (
                "▶  "
                if m == self._current_model and backend_key == self._current_backend
                else "   "
            )
            lv.append(ListItem(Label(f"{marker}{m}")))
        lv.append(ListItem(Label("   ✏  Ketik model lain...")))

        self.query_one("#prov-title", Label).update(f"PILIH MODEL  ·  {spec['label']}")
        self.query_one("#prov-hint", Label).update(
            "↑↓ navigasi   Enter pilih   Esc kembali ke provider"
        )

    # --- Event handlers ---

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        from sidelab.llm.config import PROVIDER_REGISTRY

        lv_id = event.list_view.id

        if lv_id == "provider-lv":
            idx = event.list_view.index
            if idx is not None and idx < len(self._provider_keys):
                key = self._provider_keys[idx]
                self._phase = "model"
                self.query_one("#provider-lv").display = False
                self.query_one("#model-lv").display = True
                self._populate_models(key)
                self.query_one("#model-lv").focus()

        elif lv_id == "model-lv":
            idx = event.list_view.index
            if idx is None:
                return
            if idx < len(self._model_names):
                model = self._model_names[idx]
                label = PROVIDER_REGISTRY[self._selected_backend]["label"]
                self.dismiss((self._selected_backend, model, label))
            else:
                self._phase = "custom"
                spec = PROVIDER_REGISTRY[self._selected_backend]
                self.query_one("#model-lv").display = False
                inp = self.query_one("#model-custom", Input)
                inp.display = True
                self.query_one("#prov-title", Label).update(
                    f"MODEL CUSTOM  ·  {spec['label']}"
                )
                self.query_one("#prov-hint", Label).update(
                    "Enter konfirmasi   Esc kembali ke daftar model"
                )
                inp.focus()

    def on_input_submitted(self, event: Input.Submitted) -> None:
        if self._phase != "custom":
            return
        model = event.value.strip()
        if not model:
            return
        from sidelab.llm.config import PROVIDER_REGISTRY

        label = PROVIDER_REGISTRY[self._selected_backend]["label"]
        self.dismiss((self._selected_backend, model, label))

    def action_go_back(self) -> None:
        if self._phase == "provider":
            self.dismiss(None)
        elif self._phase == "model":
            self._phase = "provider"
            self.query_one("#model-lv").display = False
            self.query_one("#provider-lv").display = True
            self._populate_providers()
        elif self._phase == "custom":
            self._phase = "model"
            inp = self.query_one("#model-custom", Input)
            inp.clear()
            inp.display = False
            from sidelab.llm.config import PROVIDER_REGISTRY

            spec = PROVIDER_REGISTRY[self._selected_backend]
            self.query_one("#prov-title", Label).update(
                f"PILIH MODEL  ·  {spec['label']}"
            )
            self.query_one("#prov-hint", Label).update(
                "↑↓ navigasi   Enter pilih   Esc kembali ke provider"
            )
            lv = self.query_one("#model-lv")
            lv.display = True
            lv.focus()


# ---------------------------------------------------------------------------
# Main App
# ---------------------------------------------------------------------------


class SidelabApp(App):

    TITLE = "SIDELAB  ·  Clinical Intelligence  ·  Sentra SideLab Project  ·  Architect dr Ferdi Iskandar"

    CSS = """
    Screen {
        background: #0C0C10;
    }

    /* Header: compact satu baris */
    Header {
        background: #0C0C10;
        color: #686870;
        height: 1;
        dock: top;
    }

    /* Footer: satu baris, minimal */
    Footer {
        background: #0C0C10;
        color: #484850;
        height: 1;
        dock: bottom;
    }

    /* Layout utama: full width & height, tidak ada padding luar */
    #main-layout {
        height: 1fr;
        width: 100%;
        margin: 0;
        padding: 0;
    }

    /* Panel kiri: 72% — area konsultasi */
    #left-pane {
        width: 72%;
        height: 100%;
        border-right: solid #1E1E24;
        padding: 0;
    }

    /* Chat log: scroll vertikal, tanpa scrollbar visible */
    #chat-log {
        height: 1fr;
        background: #0C0C10;
        padding: 0 2;
        scrollbar-size: 0 0;
        scrollbar-size-vertical: 0;
        scrollbar-background: #0C0C10;
        scrollbar-color: #0C0C10;
        scrollbar-corner-color: #0C0C10;
    }

    /* Input area: dock ke bawah panel kiri */
    #input-area {
        height: auto;
        border-top: solid #1E1E24;
        background: #0C0C10;
        padding: 0 2;
    }

    /* Input box dokter */
    #doctor-input {
        background: #080810;
        border: none;
        border-top: tall #0C0C10;
        border-bottom: tall #88A8C0;
        color: #F4F4F6;
        height: 3;
        margin: 1 0 0 0;
        padding: 0 1;
    }

    #doctor-input:focus {
        border: none;
        border-top: tall #0C0C10;
        border-bottom: tall #88A8C0;
    }

    #cmd-hint {
        color: #585868;
        background: #0C0C10;
        padding: 0 1 1 2;
        height: 2;
    }

    /* Panel kanan: 28% — sidebar info */
    #right-pane {
        width: 28%;
        height: 100%;
        background: #080810;
        padding: 1 1 0 1;
        overflow-y: scroll;
        scrollbar-size: 0 0;
        scrollbar-size-vertical: 0;
        scrollbar-background: #080810;
        scrollbar-color: #080810;
        scrollbar-corner-color: #080810;
    }

    /* Loading indicator */
    LoadingIndicator {
        display: none;
        height: 1;
        color: #88A8C0;
        background: #0C0C10;
    }

    LoadingIndicator.visible { display: block; }

    /* SideCard: kartu sidebar tanpa border keras */
    SideCard {
        height: auto;
        margin: 0 0 1 0;
        padding: 0 1;
        border: none;
        border-left: tall #1E1E24;
        background: #080810;
    }
    """

    BINDINGS = [
        Binding("ctrl+n", "new_case", "Baru", show=True),
        Binding("ctrl+p", "open_pasien", "Pasien", show=True),
        Binding("ctrl+s", "save_session", "Save", show=True),
        Binding("ctrl+y", "copy_response", "Salin", show=True),
        Binding("ctrl+b", "change_backend", "Backend", show=True),
        Binding("ctrl+h", "show_help", "Help", show=True),
        Binding("ctrl+q", "quit", "Keluar", show=True),
    ]

    def __init__(
        self,
        chat_fn: Callable,
        save_fn: Callable,
        backend_label: str = "",
        backend_key: str = "",
        model: str = "",
        session_id: str = "",
        backend_ready: bool = True,
    ) -> None:
        super().__init__()
        self._chat_fn = chat_fn
        self._save_fn = save_fn
        self._session_id = session_id
        self._backend_label = backend_label
        self._backend_key = backend_key
        self._model = model
        self._backend_ready = backend_ready
        self._history: list[dict] = []
        self._pasien: dict = {}
        self._last_response: str = ""

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        with Horizontal(id="main-layout"):
            with Vertical(id="left-pane"):
                yield RichLog(
                    id="chat-log",
                    highlight=False,
                    markup=False,
                    auto_scroll=True,
                    wrap=True,
                )
                yield LoadingIndicator(id="loading-ind")
                with Vertical(id="input-area"):
                    yield Input(
                        placeholder="  INPUT DOKTER  ›  ketik keluhan atau /help ...",
                        id="doctor-input",
                    )
                    yield Label(
                        "/provider · /pasien · /next · /save · /copy · /help · /exit",
                        id="cmd-hint",
                    )
            with ScrollableContainer(id="right-pane"):
                yield SessionCard()
                yield PatientCard()
                yield CertaintyCard()
                yield ChainCard()
                yield DataGapsCard()
        yield Footer()

    def on_mount(self) -> None:
        # Update session card setelah semua widget mounted
        self.query_one(SessionCard).update_session(
            self._session_id,
            self._backend_label,
            self._model,
            self._backend_ready,
        )
        self._print_welcome()
        self.query_one("#doctor-input", Input).focus()

    def _print_welcome(self) -> None:
        from sidelab import __version__

        log = self.query_one("#chat-log", RichLog)
        t = Text()
        t.append("SIDELAB", style=f"bold {C_NAME}")
        t.append(f" v{__version__}", style=f"dim {C_META}")
        t.append(" — Clinical Decision Support System\n", style=C_META)
        t.append(
            "Sentra SideLab Project  ·  SKDI / FORNAS 2023 / PPK IDI\n",
            style=f"dim {C_DIM}",
        )
        log.write(t)
        log.write(Rule(style=f"dim {C_DIM}"))
        if not self._backend_ready:
            w = Text()
            w.append("⚠ BACKEND TIDAK SIAP", style=f"bold {C_ALERT}")
            w.append(" — Periksa konfigurasi API key\n", style=C_ALERT)
            log.write(w)
        hint = Text()
        hint.append("Ketik keluhan atau ", style=f"dim {C_LABEL}")
        hint.append("/help", style=f"bold {C_INFO}")
        hint.append(" untuk daftar perintah\n", style=f"dim {C_LABEL}")
        log.write(hint)

    @on(Input.Submitted, "#doctor-input")
    async def on_input_submitted(self, event: Input.Submitted) -> None:
        raw = event.value.strip()
        if not raw:
            return
        event.input.clear()

        log = self.query_one("#chat-log", RichLog)
        t = Text()
        t.append("INPUT DOKTER  ›  ", style=f"bold {C_INFO}")
        t.append(raw + "\n", style=C_VALUE)
        log.write(t)

        cmd = raw.lower()
        if cmd in ("/exit", "/quit"):
            self.exit()
        elif cmd == "/help":
            self._print_help()
        elif cmd == "/next":
            self._new_case()
        elif cmd == "/save":
            self._do_save()
        elif cmd in ("/copy", "/salin"):
            self._do_copy_to_clipboard()
        elif cmd in ("/provider", "/backend", "/model"):
            self.action_change_backend()
        elif cmd.startswith("/pasien"):
            self._handle_pasien_cmd(raw)
        elif cmd.startswith("/"):
            log.write(Text(f"  Perintah tidak dikenal: {raw}\n", style=f"dim {C_WARN}"))
        else:
            if not self._backend_ready:
                log.write(Text("  ⚠ Backend tidak siap\n", style=f"bold {C_ALERT}"))
            else:
                self._run_consultation(raw)

    @work(thread=True)
    def _run_consultation(self, user_input: str) -> None:
        from sidelab.console_bridge import RichLogConsole
        from sidelab.intelligence import _match_chains, normalize_query

        log = self.query_one("#chat-log", RichLog)
        self.call_from_thread(self._set_loading, True)
        # Pass self (app) agar bridge bisa call_from_thread dengan aman
        rich_log_console = RichLogConsole(log, app=self)

        try:
            # Helper: tampilkan thinking stage ke chat log (thread-safe)
            def _think(msg: str) -> None:
                t = Text()
                t.append("  ◌ ", style=f"dim {C_INFO}")
                t.append(msg + "\n", style=f"dim {C_LABEL}")
                self.call_from_thread(log.write, t)

            normalized = normalize_query(user_input)
            _think("Menganalisis keluhan...")

            chain_matches = _match_chains(normalized)
            self.call_from_thread(
                self.query_one(ChainCard).update_chains, chain_matches
            )
            if chain_matches:
                entities = ", ".join(
                    c["chain"].get("clinical_entity", c["key"])
                    for c in chain_matches[:2]
                )
                _think(f"Clinical chains aktif: {entities}")

            _think("Mengambil referensi klinis (RAG)...")
            _think("Memproses dengan Sentra Voss 1.7 — mohon tunggu...")

            result = self._chat_fn(
                user_input,
                self._history,
                self._pasien,
                self._model,
                self._get_backend_key(),
                rich_log_console,
            )
            self._last_response = result or ""
            _think("Menyusun output terstruktur...")

            if result:
                self._update_sidebar_from_text(result)

        except Exception as exc:
            import traceback as _tb

            tb_str = _tb.format_exc()
            err = Text()
            err.append(f"  [!] Error: {exc}\n", style=f"bold {C_ALERT}")
            err.append(tb_str, style=f"dim {C_LABEL}")
            self.call_from_thread(log.write, err)
        finally:
            self.call_from_thread(self._set_loading, False)
            self.call_from_thread(self.query_one("#doctor-input", Input).focus)

    def _update_sidebar_from_text(self, text: str) -> None:
        """Update sidebar cards dari plain-text LLM response (format KAPITAL section headers)."""
        import re

        # --- DIAGNOSIS KERJA ---
        m = re.search(
            r"DIAGNOSIS KERJA:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:|$)",
            text,
            re.DOTALL,
        )
        if m:
            first_line = m.group(1).strip().split("\n")[0].strip()
            # Extract kode ICD sebelum dihapus: [M54.3]
            icd_m = re.match(r"^\[([^\]]+)\]", first_line)
            icd = icd_m.group(1) if icd_m else ""
            # Hapus kode ICD dari baris
            clean = re.sub(r"^\[[^\]]+\]\s*", "", first_line)
            # Ambil bagian sebelum em-dash (nama penyakit saja)
            nama = clean.split("—")[0].split("–")[0].strip()
            if nama:
                lower = clean.lower()
                if any(
                    w in lower
                    for w in (
                        "data kurang",
                        "belum cukup",
                        "sementara",
                        "dugaan",
                        "insufficient",
                        "tidak cukup",
                    )
                ):
                    certainty = "insufficient_data"
                elif any(w in lower for w in ("definitif", "definitive", "pasti")):
                    certainty = "definitive"
                elif any(w in lower for w in ("mungkin", "possible", "dicurigai")):
                    certainty = "possible"
                else:
                    certainty = "probable"
                self.call_from_thread(
                    self.query_one(CertaintyCard).update_certainty, certainty, nama, icd
                )

        # --- KLARIFIKASI: cari pertanyaan dari LLM response ---
        gaps: list[str] = []
        # Cari pola pertanyaan (baris berakhiran "?")
        question_lines = re.findall(r"(?:^|\n)\s*(?:\d+\.\s*)?([^.\n]{10,120}\?)", text)
        if question_lines:
            gaps = [q.strip() for q in question_lines[:4] if q.strip()]
        if gaps:
            self.call_from_thread(self.query_one(DataGapsCard).update_gaps, gaps)

    def _get_backend_key(self) -> str:
        return self._backend_key or "deepseek"

    def _set_loading(self, loading: bool) -> None:
        ind = self.query_one("#loading-ind", LoadingIndicator)
        inp = self.query_one("#doctor-input", Input)
        if loading:
            ind.add_class("visible")
            inp.disabled = True
        else:
            ind.remove_class("visible")
            inp.disabled = False

    def _print_help(self) -> None:
        log = self.query_one("#chat-log", RichLog)
        t = Text()
        t.append("\nPERINTAH\n", style=f"bold {C_BORDER}")
        for cmd, desc in [
            ("/pasien nama=X umur=Y jk=L", "Set data pasien aktif"),
            ("/provider", "Ganti provider / model LLM"),
            ("/next", "Kasus baru, reset state"),
            ("/save", "Simpan sesi ke file"),
            ("/copy", "Salin respons terakhir ke clipboard"),
            ("/help", "Tampilkan bantuan ini"),
            ("/exit", "Keluar dari SIDELAB"),
        ]:
            t.append(f"  {cmd:<36}", style=f"bold {C_INFO}")
            t.append(f"{desc}\n", style=C_VALUE)
        t.append("\n", style=C_DIM)
        t.append("PINTASAN KEYBOARD\n", style=f"bold {C_BORDER}")
        for key, desc in [
            ("Ctrl+B", "Pilih backend / model"),
            ("Ctrl+N", "Kasus baru"),
            ("Ctrl+P", "Set data pasien"),
            ("Ctrl+S", "Simpan sesi"),
            ("Ctrl+Y", "Salin respons ke clipboard"),
            ("Ctrl+Q", "Keluar"),
        ]:
            t.append(f"  {key:<12}", style=f"bold {C_META}")
            t.append(f"{desc}\n", style=C_VALUE)
        log.write(t)

    def _new_case(self) -> None:
        import uuid

        log = self.query_one("#chat-log", RichLog)
        self._history.clear()
        self._pasien = {}
        self._session_id = uuid.uuid4().hex[:8].upper()
        self._last_response = ""
        self.query_one(SessionCard).update_session(
            self._session_id, self._backend_label, self._model, self._backend_ready
        )
        self.query_one(PatientCard).update_patient({})
        self.query_one(CertaintyCard).update_certainty("", "")
        self.query_one(ChainCard).update_chains([])
        self.query_one(DataGapsCard).update_gaps([])
        log.write(Rule(style=f"dim {C_DIM}"))
        log.write(Text("  Kasus baru dimulai.\n", style=f"dim {C_META}"))

    def _handle_pasien_cmd(self, raw: str) -> None:
        """Parse /pasien key=value pairs dan update patient data."""
        log = self.query_one("#chat-log", RichLog)
        import re

        pairs = re.findall(r"(\w+)=([^\s]+)", raw)
        if not pairs:
            log.write(
                Text(
                    "  Format: /pasien nama=Budi umur=45 jk=L alergi=penisilin\n",
                    style=f"dim {C_META}",
                )
            )
            return
        for k, v in pairs:
            self._pasien[k.lower()] = v
        self.query_one(PatientCard).update_patient(self._pasien)
        t = Text()
        t.append("  Data pasien diperbarui: ", style=f"dim {C_SUCCESS}")
        t.append(", ".join(f"{k}={v}" for k, v in pairs) + "\n", style=C_VALUE)
        log.write(t)

    def _do_save(self) -> None:
        log = self.query_one("#chat-log", RichLog)
        if not self._history:
            log.write(Text("  Tidak ada sesi untuk disimpan.\n", style=f"dim {C_WARN}"))
            return
        try:
            self._save_fn(self._history, self._pasien, self._session_id)
            log.write(
                Text(f"  Sesi disimpan: {self._session_id}\n", style=f"dim {C_SUCCESS}")
            )
        except Exception as e:
            log.write(Text(f"  Gagal menyimpan: {e}\n", style=f"bold {C_ALERT}"))

    def action_new_case(self) -> None:
        self._new_case()

    def action_open_pasien(self) -> None:
        log = self.query_one("#chat-log", RichLog)
        log.write(
            Text(
                "  Ketik: /pasien nama=X umur=Y jk=L alergi=... komorbid=...\n",
                style=f"dim {C_META}",
            )
        )

    def action_save_session(self) -> None:
        self._do_save()

    def action_show_help(self) -> None:
        self._print_help()

    def action_change_backend(self) -> None:
        self.push_screen(
            ProviderScreen(self._backend_key, self._model),
            self._apply_backend_change,
        )

    def _apply_backend_change(self, result: tuple | None) -> None:
        if result is None:
            return
        backend_key, model, label = result
        self._backend_key = backend_key
        self._model = model
        self._backend_label = label
        from sidelab.llm import check_backend_readiness

        is_ready, _, _ = check_backend_readiness(backend_key)
        self._backend_ready = is_ready
        self.query_one(SessionCard).update_session(
            self._session_id, label, model, is_ready
        )
        log = self.query_one("#chat-log", RichLog)
        t = Text()
        t.append("  ✓ Backend diganti: ", style=f"bold {C_INFO}")
        t.append(f"{label}", style=C_VALUE)
        t.append(" / ", style=C_DIM)
        t.append(f"{model}\n", style=f"bold {C_NAME}")
        log.write(t)

    def action_copy_response(self) -> None:
        self._do_copy_to_clipboard()

    def _do_copy_to_clipboard(self) -> None:
        log = self.query_one("#chat-log", RichLog)
        if not self._last_response:
            log.write(
                Text(
                    "  ⚠ Belum ada respons yang bisa disalin.\n", style=f"bold {C_WARN}"
                )
            )
            return
        ok = self._copy_text(self._last_response)
        if ok:
            t = Text()
            t.append("  ✓ ", style=f"bold {C_INFO}")
            t.append(
                "Respons disalin ke clipboard — siap paste ke RME.\n", style=C_VALUE
            )
            log.write(t)
        else:
            log.write(
                Text("  ⚠ Gagal menyalin ke clipboard.\n", style=f"bold {C_ALERT}")
            )

    @staticmethod
    def _copy_text(text: str) -> bool:
        import subprocess

        try:
            proc = subprocess.Popen(
                ["clip.exe"],
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            proc.communicate(input=text.encode("utf-16-le"))
            return proc.returncode == 0
        except Exception:
            pass
        try:
            subprocess.run(
                [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    "Set-Clipboard",
                    "-Value",
                    text,
                ],
                capture_output=True,
                timeout=5,
            )
            return True
        except Exception:
            return False
