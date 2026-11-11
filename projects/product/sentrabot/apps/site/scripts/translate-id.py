"""Translate visible landing copy to Bahasa Indonesia."""
from pathlib import Path

REPLACEMENTS = [
    (
        "Sentra Bot — platform multi-agen local-first. Self-hosted. BYOK. Data tetap di infra Anda.",
        "Sentra Bot — platform multi-agen local-first & self-hosted dengan BYOK. Data tetap di infra Anda.",
    ),
    (
        "“I paused Sentra Bot just to feel the difference. The difference was felt. Scrambling to bring my agents back online.“",
        "“Saya menghentikan Sentra Bot hanya untuk merasakan bedanya. Bedanya terasa. Langsung buru-buru menyalakan agen lagi.“",
    ),
    (
        "“I've tried the big agent platforms. The winner, by far, is Sentra Bot — local-first, on my infra.“",
        "“Saya sudah mencoba platform agen besar. Pemenangnya jelas: Sentra Bot — local-first, di infra saya sendiri.“",
    ),
    (
        "“I’ve been running Sentra Bot for weeks...this morning was a record; routines handled the busywork and left me a clean Brief instead.“",
        "“Saya menjalankan Sentra Bot berminggu-minggu...pagi ini rekor; rutinitas menangani kerjaan rutin dan menyisakan Brief yang rapi.“",
    ),
    (
        "“I've been using Sentra Bot for months. Agents clear the noise; I only touch what needs a human decision.“",
        "“Saya memakai Sentra Bot berbulan-bulan. Agen membersihkan noise; saya hanya menyentuh yang butuh keputusan manusia.“",
    ),
    (
        "“Multi-agent ops on steroids \n→ sentrahai.com“",
        "“Operasi multi-agen setingkat profesional \n→ sentrahai.com“",
    ),
    (
        "“Multi-agent ops on steroids → sentrahai.com“",
        "“Operasi multi-agen setingkat profesional → sentrahai.com“",
    ),
    (
        "“Using Sentra Bot for the last month has changed how I run agent work“",
        "“Sebulan memakai Sentra Bot mengubah cara saya menjalankan kerja agen“",
    ),
    (
        "“Been in since beta. I open every routine summary. Still feels like magic“",
        "“Ikut sejak beta. Saya buka setiap ringkasan rutinitas. Masih terasa ajaib“",
    ),
    (
        "“Agents now draft/summarize my ops noise, and the dry, businesslike Briefs are becoming my favorite daily ritual.“",
        "“Agen kini menyusun/meringkas noise operasional saya, dan Brief yang ringkas nan profesional jadi ritual harian favorit.“",
    ),
    ('alt="Company logo"', 'alt="Logo perusahaan"'),
    ('alt="clouds"', 'alt="awan"'),
    ("Sentra Bot triages your work", "Sentra Bot memilah pekerjaan Anda"),
    (
        "Sentra Bot knows what’s important to you and which tasks need a human decision. It keeps those items in view for you to act on ASAP.",
        "Sentra Bot tahu mana yang penting bagi Anda dan tugas mana yang butuh keputusan manusia. Item itu tetap terlihat agar Anda segera bertindak.",
    ),
    ("Agents draft actions in your voice", "Agen menyusun tindakan dengan gaya Anda"),
    (
        "Whenever an agent has enough context from your history to prepare a great next step for you, it does.",
        "Begitu agen punya cukup konteks dari riwayat Anda untuk menyiapkan langkah berikutnya yang tepat, ia langsung menyusunnya.",
    ),
    ("Permission: run sandbox task", "Izin: jalankan tugas sandbox"),
    (
        "Routine queued a sandbox step. Review the permission card and Allow / Deny so we stay on track for the deploy window. Flag anything that looks off.",
        "Rutinitas mengantri langkah sandbox. Tinjau kartu izin lalu Izinkan / Tolak agar jadwal deploy tetap on track. Tandai jika ada yang mencurigakan.",
    ),
    ("Agent Draft", "Draf Agen"),
    ("Re: Deploy checklist — confirm Allow", "Re: Checklist deploy — konfirmasi Izinkan"),
    ("Best,", "Salam,"),
    ("The rest gets <i class=\"italic\">Briefed</i>", "Sisanya mendapat <i class=\"italic\">Brief</i>"),
    (
        "Twice a day, Sentra Bot sends you a beautiful Brief that summarizes everything agents handled—and what still needs you. Scan your ops in 30 seconds instead of 3 hours.",
        "Dua kali sehari, Sentra Bot mengirim Brief yang merangkum semua yang ditangani agen—dan yang masih butuh Anda. Pindai operasional dalam 30 detik, bukan 3 jam.",
    ),
    ("Today’s Brief", "Brief Hari Ini"),
    (">Morning<", ">Pagi<"),
    (">Afternoon<", ">Sore<"),
    (">All agents<", ">Semua agen<"),
    ('alt="Brief card 1"', 'alt="Kartu Brief 1"'),
    ('alt="Brief card 2"', 'alt="Kartu Brief 2"'),
    ('alt="Brief card 3"', 'alt="Kartu Brief 3"'),
    ('alt="Brief card 4"', 'alt="Kartu Brief 4"'),
    ('alt="Brief card 5"', 'alt="Kartu Brief 5"'),
    ('alt="Brief card 6"', 'alt="Kartu Brief 6"'),
    ("Sentra Bot learns you inside and out", "Sentra Bot mengenal Anda secara menyeluruh"),
    ("Agents get to know you, automatically", "Agen mengenal Anda, secara otomatis"),
    (
        "Agents read your work patterns to discover who you are—your ops, your style, and your priorities.",
        "Agen membaca pola kerja Anda untuk memahami siapa Anda—operasi, gaya, dan prioritas Anda.",
    ),
    ("Shape agents through conversation", "Bentuk agen lewat percakapan"),
    (
        "Talk to agents like teammates over chat. Explain how you want tasks filed and situations handled. They remember everything that matters.",
        "Ngobrol dengan agen seperti rekan kerja. Jelaskan cara Anda ingin tugas diarsipkan dan situasi ditangani. Mereka mengingat semua yang penting.",
    ),
    ('alt="Only for CEOs"', 'alt="Khusus CEO"'),
    ('alt="Only for designers"', 'alt="Khusus desainer"'),
    ("Security and privacy are built in", "Keamanan dan privasi sudah built-in"),
    ("We never train on your data", "Kami tidak pernah melatih model dengan data Anda"),
    (
        "Agents may call LLMs with your BYOK keys, but your data is never used to train models.",
        "Agen boleh memanggil LLM dengan kunci BYOK Anda, tetapi data Anda tidak pernah dipakai untuk melatih model.",
    ),
    ("No one can see your transcripts", "Tidak ada yang bisa melihat transkrip Anda"),
    (
        "We have no backdoor access or ability to view your local data. Period.",
        "Kami tidak punya akses backdoor atau kemampuan melihat data lokal Anda. Titik.",
    ),
    ("Agents can’t act without permission", "Agen tidak bisa bertindak tanpa izin"),
    (
        "Destructive or external actions wait on your Allow / Deny permission card.",
        "Tindakan destruktif atau eksternal menunggu kartu izin Izinkan / Tolak dari Anda.",
    ),
    ("Top security standards", "Standar keamanan tinggi"),
    (
        "Sentra Bot is local-first, sandboxed, and human-gated by default.",
        "Sentra Bot bersifat local-first, tersandbox, dan digate oleh manusia secara default.",
    ),
    ("Pick a plan", "Pilih paket"),
    ("Yearly (save 20%)", "Tahunan (hemat 20%)"),
    (">Monthly<", ">Bulanan<"),
    ("$20/month", "$20/bulan"),
    ("Billed anually as $240", "Ditagih tahunan sebesar $240"),
    ("Includes 2 agent seats", "Termasuk 2 kursi agen"),
    ("AI task triage & routines", "Triage tugas AI & rutinitas"),
    ("Permission-gated agent drafts", "Draf agen berpagar izin"),
    ("Daily Brief summaries", "Ringkasan Brief harian"),
    ("Technical support", "Dukungan teknis"),
    ("$39/month", "$39/bulan"),
    ("Billed anually as $470", "Ditagih tahunan sebesar $470"),
    ("Everything in Professional", "Semua yang ada di Professional"),
    ("Includes unlimited agent seats", "Termasuk kursi agen tanpa batas"),
    (
        "Or self-host the full Sentra Bot stack — agents, routines, and sandboxes with BYOK — on your own infra for only $20 per month",
        "Atau self-host seluruh stack Sentra Bot — agen, rutinitas, dan sandbox dengan BYOK — di infra Anda sendiri hanya $20 per bulan",
    ),
    (
        "“I've tried the big agent platforms. The winner, by far, is Sentra Bot — local-first, on my infra.”",
        "“Saya sudah mencoba platform agen besar. Pemenangnya jelas: Sentra Bot — local-first, di infra saya sendiri.”",
    ),
    ("Free Yourself from Busywork", "Bebaskan Diri dari Kerjaan Rutin"),
    (
        "Let Sentra Bot handle the busywork, so you can regain time to focus on what matters.",
        "Biarkan Sentra Bot menangani kerjaan rutin, agar Anda punya waktu fokus pada yang penting.",
    ),
    (">Privacy<", ">Privasi<"),
    (">Terms<", ">Ketentuan<"),
    ("Frequently asked questions", "Pertanyaan yang sering diajukan"),
    (
        "Wait, do agents actually run commands without me?",
        "Sebentar, apakah agen benar-benar menjalankan perintah tanpa saya?",
    ),
    (
        "No, agents never run destructive or external actions without you. They prepare next steps and wait on your Allow / Deny permission card. You review, edit if needed, and decide. Think of it as a teammate who drafts options—not someone who acts on your behalf unchecked.",
        "Tidak. Agen tidak pernah menjalankan tindakan destruktif atau eksternal tanpa Anda. Mereka menyiapkan langkah berikutnya dan menunggu kartu izin Izinkan / Tolak. Anda meninjau, mengedit jika perlu, lalu memutuskan. Anggap saja rekan yang menyusun opsi—bukan yang bertindak tanpa kontrol.",
    ),
    (
        "How does Sentra Bot know what's 'important' to me?",
        "Bagaimana Sentra Bot tahu apa yang 'penting' bagi saya?",
    ),
    (
        "When you first connect, agents learn from your work patterns—what you escalate quickly, which tools you use, and how you decide. They surface what likely needs a human, and you can chat to refine priorities over time.",
        "Saat pertama terhubung, agen belajar dari pola kerja Anda—apa yang Anda eskalasi cepat, tools yang dipakai, dan cara Anda memutuskan. Mereka menampilkan yang kemungkinan butuh manusia, dan Anda bisa chat untuk menyesuaikan prioritas seiring waktu.",
    ),
    (
        "What if a Brief misses something important?",
        "Bagaimana jika Brief melewatkan sesuatu yang penting?",
    ),
    (
        "You can always open the full routine log and transcript, so you’ll know you never miss anything. If a Brief under- or over-prioritizes, chat with the agent to correct it—and it remembers.",
        "Anda selalu bisa membuka log rutinitas dan transkrip lengkap, jadi tidak ada yang terlewat. Jika Brief kurang atau terlalu memprioritaskan, chat dengan agen untuk dikoreksi—dan ia mengingatnya.",
    ),
    ("Is this cloud-only?", "Apakah ini hanya cloud?"),
    (
        "No. Sentra Bot is local-first and self-hosted by default. You bring your own keys and keep transcripts on your infra.",
        "Tidak. Sentra Bot bersifat local-first dan self-hosted secara default. Anda membawa kunci sendiri (BYOK) dan menyimpan transkrip di infra Anda.",
    ),
    ("What exactly is a 'Brief'?", "Apa sebenarnya 'Brief' itu?"),
    (
        "A Brief is a scannable summary of what agents handled and what still needs you—routines, drafts, and permission waits. It's designed to be read in 30 seconds instead of digging through every transcript. You can read it in the workspace.",
        "Brief adalah ringkasan yang mudah dipindai tentang apa yang ditangani agen dan apa yang masih butuh Anda—rutinitas, draf, dan antrean izin. Dirancang dibaca dalam 30 detik, bukan menggali setiap transkrip. Anda bisa membacanya di workspace.",
    ),
    ("How long is the free trial?", "Berapa lama uji coba gratisnya?"),
    (
        "You can request beta access and try Sentra Bot free during the evaluation window.",
        "Anda dapat mengajukan akses beta dan mencoba Sentra Bot gratis selama jendela evaluasi.",
    ),
    (
        "If agents can read my workspace to learn how I work... is that safe?",
        "Jika agen bisa membaca workspace saya untuk belajar cara kerja saya... apakah aman?",
    ),
    (
        "Agents call models with your BYOK keys. Credentials, transcripts, and files stay on your machine or private host by default—with zero vendor backdoor to your local data.",
        "Agen memanggil model dengan kunci BYOK Anda. Kredensial, transkrip, dan file tetap di mesin atau host privat Anda secara default—tanpa backdoor vendor ke data lokal.",
    ),
    (
        "What happens to my existing backlog of tasks?",
        "Bagaimana dengan backlog tugas yang sudah ada?",
    ),
    (
        "Agents focus on work from the moment you turn them on. Backlog import and cleanup tools are on the roadmap. Stay tuned.",
        "Agen fokus pada pekerjaan sejak Anda menyalakannya. Fitur impor dan pembersihan backlog ada di roadmap. Pantau terus.",
    ),
    (
        "Can I turn it off if I don't like it?",
        "Bisakah saya mematikannya jika tidak suka?",
    ),
    (
        "Yes, absolutely. You can always stop agents whenever you want. You can also disable specific capabilities—like drafts or scheduled routines—in settings.",
        "Bisa, tentu saja. Anda selalu bisa menghentikan agen kapan saja. Anda juga bisa menonaktifkan kemampuan tertentu—seperti draf atau rutinitas terjadwal—di pengaturan.",
    ),
    (
        "Do I replace my current tools or run Sentra Bot alongside them?",
        "Apakah saya mengganti tools yang ada atau menjalankan Sentra Bot di sampingnya?",
    ),
    (
        "Sentra Bot sits alongside your stack. Agents connect through integrations and sandboxes—you keep your existing apps, with less manual busywork.",
        "Sentra Bot berjalan di samping stack Anda. Agen terhubung lewat integrasi dan sandbox—aplikasi yang ada tetap dipakai, dengan lebih sedikit kerjaan manual.",
    ),
    ("How many agent seats can I add?", "Berapa banyak kursi agen yang bisa ditambahkan?"),
    (
        "You can add up to 2 agent seats on the Professional plan or unlimited seats on the Unlimited plan.",
        "Anda dapat menambahkan hingga 2 kursi agen di paket Professional atau kursi tanpa batas di paket Unlimited.",
    ),
    ("What is Sentra?", "Apa itu Sentra?"),
    (
        'Sentra Artificial Intelligence builds Sentra Bot—a local-first, self-hosted multi-agent platform for operators who need execution with human gates, not a vendor-locked chat box. Learn more at <a href="https://sentrahai.com" class="underline">sentrahai.com</a>.',
        'Sentra Artificial Intelligence membangun Sentra Bot—platform multi-agen local-first & self-hosted untuk operator yang butuh eksekusi dengan pagar manusia, bukan kotak chat yang terkunci vendor. Pelajari lebih lanjut di <a href="https://sentrahai.com" class="underline">sentrahai.com</a>.',
    ),
]

# Longer first
REPLACEMENTS.sort(key=lambda x: len(x[0]), reverse=True)

def apply(path: Path) -> int:
    t = path.read_text(encoding="utf-8")
    n = 0
    for old, new in REPLACEMENTS:
        c = t.count(old)
        if c:
            t = t.replace(old, new)
            n += c
    # Send button / aria draft body fragments
    if ">Send<" in t:
        t = t.replace(">Send<", ">Kirim<")
        n += 1
    # Demo draft email body (may be long); replace common English opener if still present
    eng = "Loved the deck and the way Monologue personalizes your responses."
    idn = "Suka sekali deck-nya dan cara personalisasi responsnya."
    if eng in t:
        # replace from eng through end of that text node carefully via regex-less cut
        # Full known original (if present)
        full_eng = (
            "Loved the deck and the way Monologue personalizes your responses. Spells! What a great name. "
            "We’re excited to move forward and would like to hash out next steps on a quick call tomorrow at 11am ET—does that work for you?"
        )
        full_idn = (
            "Suka sekali deck-nya dan cara personalisasi responsnya. Nama yang bagus! "
            "Kami siap lanjut dan ingin membahas langkah berikutnya lewat panggilan singkat besok pukul 11.00 — apakah memungkinkan?"
        )
        if full_eng in t:
            t = t.replace(full_eng, full_idn)
            n += 1
        else:
            # aria-label may truncate; replace any remaining Loved the deck... chunks
            import re
            t2, c = re.subn(
                r"Loved the deck and the way Monologue personalizes your responses\.[^<\"]*",
                full_idn,
                t,
            )
            t = t2
            n += c
    path.write_text(t, encoding="utf-8")
    return n

def main() -> None:
    total = 0
    for path in sorted(Path("src/html").glob("*.html")):
        c = apply(path)
        print(f"{path.name}: {c}")
        total += c

    hook = Path("src/hooks/usePricingTabs.js")
    ht = hook.read_text(encoding="utf-8")
    for a, b in [
        ("$20/month", "$20/bulan"),
        ("$25/month", "$25/bulan"),
        ("$39/month", "$39/bulan"),
        ("$49/month", "$49/bulan"),
        ("Billed anually as $240", "Ditagih tahunan sebesar $240"),
        ("Billed anually as $470", "Ditagih tahunan sebesar $470"),
    ]:
        ht = ht.replace(a, b)
    hook.write_text(ht, encoding="utf-8")
    print("hook ok, total html hits", total)

if __name__ == "__main__":
    main()
