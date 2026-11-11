"""Colokan sumber data RME (jalur masuk yang bisa ditukar).

Urutan realistis per keputusan Chief:
1. read-only DB (ODBC/JDBC/MySQL/Postgres/SQL Server) — terbaik bila IT kasih akses
2. scheduled export folder (CSV/XLSX/XML via folder/SFTP) — paling universal
3. HL7 v2 feed (ADT/pasien/kunjungan/lab) — jalur RS standar lama
4. RPA / report scraping — paling rapuh, audit ketat
5. backup / DB replica — aman untuk awal migrasi

Semua mengembalikan bentuk seragam (list of dict baris mentah) sehingga inti
pipeline tidak peduli data datang dari mana.
"""

from sentra_mantra_integrations.rme_bridge.sources.base import Source
from sentra_mantra_integrations.rme_bridge.sources.folder import FolderSource
from sentra_mantra_integrations.rme_bridge.sources.readonly_db import ReadOnlyDBSource

__all__ = ["FolderSource", "ReadOnlyDBSource", "Source"]
