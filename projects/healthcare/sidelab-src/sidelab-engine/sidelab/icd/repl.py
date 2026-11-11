# Architected and built by codieverse+.
"""REPL handler untuk command `/icd` di SIDELAB.

Encapsulate semua display logic supaya integrasi ke medgemma_chat.py
hanya butuh satu import + satu handler block yang panggil
`handle_icd_command(user_input, console)`.
"""

from __future__ import annotations

from .database import metadata
from .search import (
    is_code_query,
    lookup_or_children,
    search,
)


def _format_entry_block(entry: dict) -> list[str]:
    code = entry.get("code", "?")
    name_id = entry.get("name_id", "-")
    name_en = entry.get("name_en", "")
    chapter = entry.get("chapter", "")
    chapter_name = entry.get("chapter_name_id", "")
    parent = entry.get("parent_code")
    out = [f"  [bold cyan]{code}[/bold cyan]  [yellow]{name_id}[/yellow]"]
    if name_en:
        out.append(f"    [dim]EN:[/dim] {name_en}")
    if chapter:
        out.append(f"    [dim]Chapter:[/dim] {chapter} — {chapter_name}")
    if parent:
        out.append(f"    [dim]Parent:[/dim] {parent}")
    return out


def _format_list_row(entry: dict) -> str:
    code = entry.get("code", "?")
    name_id = entry.get("name_id", "-")
    return f"  [cyan]{code:8s}[/cyan] [yellow]{name_id}[/yellow]"


def handle_icd_command(user_input: str, console) -> None:
    """Handle /icd command. Console = Rich Console instance dari caller.

    user_input format: '/icd', '/icd I10', '/icd hipertensi'
    """
    arg = user_input[4:].strip() if user_input else ""
    console.print()

    if not arg:
        meta = metadata()
        total = meta.get("total_codes", 0)
        console.print(
            f"  [bold]Kamus ICD-10 Indonesia[/bold] — {total} kode tersedia",
            style="grey82",
        )
        console.print("  Penggunaan:", style="dim grey50")
        console.print(
            "    [cyan]/icd I10[/cyan]            lookup berdasarkan kode",
            style="grey82",
        )
        console.print(
            "    [cyan]/icd E11[/cyan]            kode parent — tampil semua sub-kode",
            style="grey82",
        )
        console.print(
            "    [cyan]/icd hipertensi[/cyan]     cari berdasarkan nama (ID/EN)",
            style="grey82",
        )
        console.print()
        return

    if is_code_query(arg):
        direct, kids = lookup_or_children(arg)
        if direct:
            for line in _format_entry_block(direct):
                console.print(line)
        elif kids:
            console.print(
                f"  [bold]{arg.upper()} family[/bold] [dim]({len(kids)} sub-kode)[/dim]",
                style="grey82",
            )
            for kid in kids:
                console.print(_format_list_row(kid))
        else:
            console.print(f"  Kode {arg.upper()} tidak ditemukan.", style="dim grey50")
        console.print()
        return

    results = search(arg, limit=15)
    if results:
        console.print(
            f"  [bold]Hasil pencarian:[/bold] {arg!r} [dim]({len(results)} hasil)[/dim]",
            style="grey82",
        )
        for entry in results:
            console.print(_format_list_row(entry))
    else:
        console.print(f"  Tidak ada hasil untuk {arg!r}.", style="dim grey50")
    console.print()
