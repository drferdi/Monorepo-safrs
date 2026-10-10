# Retriever — Complete Tech Website Archiving & AI Corpus Engine

Retriever adalah engine scraping dan pengarsipan website teknologi berskala luas yang menggabungkan kekuatan core native **WinHTTrack v3.50** (`C:\Program Files\WinHTTrack\httrack.exe`) dengan **Modern AI Markdown Corpus Pipeline** dan antarmuka **macOS Console Theme** identik dengan `internal/prompt` (JetBrains Mono 11px, 556×367, dark `#16191d`).

---

## 🌟 Fitur Utama

1. **Anti-Blocking User-Agent & Modern Headers**:
   - Spoofing modern Chrome 134 macOS Sequoia dengan header navigasi mutakhir agar tidak diblok oleh Cloudflare/Vercel/GitHub.

2. **Perintah UI Super Cepat**:
   - `retrieve <url> [depth]` -> Complete website scrape (100% offline mirror dengan rewritten links).
   - `retrieve ai/llm <url>` -> Ekstraksi clean Markdown corpus untuk AI, LLM, dan RAG.
   - `open` -> Langsung membuka folder hasil download di Windows Explorer.
   - `profiles` -> Menampilkan 6 preset profiling scraping.

3. **macOS Console UI (Identik Sentra Prompt)**:
   - Window size fixed 556×367 (80 cols × 20 rows).
   - Traffic lights window control (`● ● ●`).
   - Drag & drop window positioning mulus tanpa lag.

---

## 🚀 Cara Menjalankan

### Cara 1: Double-click Desktop Shortcut / Batch
Jalankan shortcut **Retriever** di Desktop atau double click [Run-Retriever.bat](Run-Retriever.bat).

### Cara 2: Melalui Terminal (Desktop App)
```powershell
cd D:\DEV\monorepo\tools\retriever
pnpm run desktop:start
```

### Cara 3: Melalui CLI Parameter
```powershell
pnpm start -- -u https://fastapi.tiangolo.com/ -p tech-docs -d 3 -o ./data/scrapes/fastapi
```

---

## 🧪 Testing & Verifikasi
```powershell
# Jalankan smoke test
pnpm run desktop:smoke

# Validasi kemandirian SAFRS
python D:\DEV\monorepo\tools\safrs\check_project_independence.py --root D:\DEV\monorepo
```
